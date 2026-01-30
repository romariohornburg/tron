#!/bin/bash

set -e

# Configurações
API_URL="${API_URL:-http://localhost:8000}"
TOKEN_NAME="setup-script-token"
TOKEN_FILE="${TOKEN_FILE:-./volumes/token/api-token.txt}"
KUBECONFIG_FILE="${KUBECONFIG_FILE:-./volumes/kubeconfig/kubeconfig.yaml}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-local}"
CLUSTER_NAME="${CLUSTER_NAME:-local-cluster}"
CLUSTER_API_ADDRESS="${CLUSTER_API_ADDRESS:-https://k3s-server:5443}"  # Port 5443 as configured in docker-compose
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME:-tron}"
SERVICE_ACCOUNT_NAMESPACE="${SERVICE_ACCOUNT_NAMESPACE:-kube-system}"
ORGANIZATION_UUID="${ORGANIZATION_UUID:-}"  # Se não fornecido, será buscada a primeira organização

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Validando/Criando token de API...${NC}"

# Verificar se a API está acessível
if ! curl -s -f "${API_URL}/docs" &>/dev/null; then
    echo -e "${RED}❌ API não está acessível em ${API_URL}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API está acessível${NC}"

# Solicitar credenciais se não estiverem definidas
if [ -z "$ADMIN_EMAIL" ]; then
    echo -e "${YELLOW}📧 Email:${NC}"
    read -r ADMIN_EMAIL
fi

if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${YELLOW}🔒 Senha:${NC}"
    read -rs ADMIN_PASSWORD
    echo ""  # Nova linha após senha oculta
fi

# Fazer login
echo -e "${YELLOW}🔐 Fazendo login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"${ADMIN_EMAIL}\", \"password\": \"${ADMIN_PASSWORD}\"}")

JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}❌ Erro ao fazer login${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Login realizado${NC}"

# Obter UUID do usuário atual
echo -e "${YELLOW}🔍 Obtendo informações do usuário...${NC}"
USER_INFO_RESPONSE=$(curl -s -X GET "${API_URL}/auth/me" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

USER_UUID=$(echo "$USER_INFO_RESPONSE" | jq -r '.uuid // empty')

if [ -z "$USER_UUID" ] || [ "$USER_UUID" = "null" ]; then
    echo -e "${RED}❌ Erro ao obter informações do usuário${NC}"
    echo "$USER_INFO_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ UUID do usuário obtido: ${USER_UUID}${NC}"

# Obter ou buscar organização
if [ -z "$ORGANIZATION_UUID" ]; then
    echo -e "${YELLOW}🔍 Buscando organização padrão...${NC}"
    ORGANIZATIONS_RESPONSE=$(curl -s -X GET "${API_URL}/organizations/" \
        -H "Authorization: Bearer ${JWT_TOKEN}")

    ORGANIZATION_UUID=$(echo "$ORGANIZATIONS_RESPONSE" | jq -r '.[0].uuid // empty' | head -1)

    if [ -z "$ORGANIZATION_UUID" ] || [ "$ORGANIZATION_UUID" = "null" ]; then
        echo -e "${RED}❌ Nenhuma organização encontrada. Por favor, crie uma organização primeiro ou defina ORGANIZATION_UUID${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Usando organização: ${ORGANIZATION_UUID}${NC}"
else
    echo -e "${GREEN}✓ Usando organização fornecida: ${ORGANIZATION_UUID}${NC}"
fi

# Verificar se token existe no backend
echo -e "${YELLOW}🔍 Verificando se token existe no backend...${NC}"
TOKENS_RESPONSE=$(curl -s -X GET "${API_URL}/users/${USER_UUID}/tokens" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

TOKEN_EXISTS=$(echo "$TOKENS_RESPONSE" | jq -r ".[] | select(.name == \"${TOKEN_NAME}\") | .uuid" | head -1)

if [ -n "$TOKEN_EXISTS" ] && [ "$TOKEN_EXISTS" != "null" ]; then
    echo -e "${GREEN}✓ Token já existe no backend${NC}"

    # Verificar se temos o token salvo
    if [ -f "$TOKEN_FILE" ]; then
        SAVED_TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n\r ')
        if [ -n "$SAVED_TOKEN" ]; then
            # Testar se funciona (usando endpoint de organizations)
            TEST_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${API_URL}/organizations/${ORGANIZATION_UUID}/environments/" \
                -H "x-tron-token: ${SAVED_TOKEN}")
            if [ "$TEST_CODE" = "200" ]; then
                echo -e "${GREEN}✓ Token salvo ainda é válido${NC}"
                API_TOKEN="$SAVED_TOKEN"
            else
                echo -e "${YELLOW}⚠️  Token salvo não é válido. Deletando e criando novo...${NC}"
                curl -s -X DELETE "${API_URL}/users/${USER_UUID}/tokens/${TOKEN_EXISTS}" \
                    -H "Authorization: Bearer ${JWT_TOKEN}" > /dev/null
                API_TOKEN=""
            fi
        else
            echo -e "${YELLOW}⚠️  Token existe no backend mas não temos o valor. Deletando...${NC}"
            curl -s -X DELETE "${API_URL}/users/${USER_UUID}/tokens/${TOKEN_EXISTS}" \
                -H "Authorization: Bearer ${JWT_TOKEN}" > /dev/null
            API_TOKEN=""
        fi
    else
        echo -e "${YELLOW}⚠️  Token existe no backend mas não temos o valor. Deletando...${NC}"
        curl -s -X DELETE "${API_URL}/users/${USER_UUID}/tokens/${TOKEN_EXISTS}" \
            -H "Authorization: Bearer ${JWT_TOKEN}" > /dev/null
        API_TOKEN=""
    fi
else
    API_TOKEN=""
fi

# Criar novo token se necessário
if [ -z "$API_TOKEN" ]; then
    echo -e "${YELLOW}📝 Criando novo token...${NC}"
    CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/users/${USER_UUID}/tokens" \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"${TOKEN_NAME}\"}")

    API_TOKEN=$(echo "$CREATE_RESPONSE" | jq -r '.token // empty')

    if [ -z "$API_TOKEN" ]; then
        echo -e "${RED}❌ Erro ao criar token${NC}"
        echo "$CREATE_RESPONSE"
        exit 1
    fi

    # Salvar token
    mkdir -p "$(dirname "$TOKEN_FILE")"
    echo "$API_TOKEN" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"

    echo -e "${GREEN}✓ Token criado e salvo em ${TOKEN_FILE}${NC}"
fi

# Verificar/criar ambiente
echo -e "${YELLOW}🔍 Verificando ambiente '${ENVIRONMENT_NAME}'...${NC}"
ENVIRONMENTS_RESPONSE=$(curl -s -X GET "${API_URL}/organizations/${ORGANIZATION_UUID}/environments/" \
    -H "x-tron-token: ${API_TOKEN}")

ENVIRONMENT_UUID=$(echo "$ENVIRONMENTS_RESPONSE" | jq -r ".[] | select(.name == \"${ENVIRONMENT_NAME}\") | .uuid" | head -1)

if [ -n "$ENVIRONMENT_UUID" ] && [ "$ENVIRONMENT_UUID" != "null" ]; then
    echo -e "${GREEN}✓ Ambiente '${ENVIRONMENT_NAME}' já existe${NC}"
else
    echo -e "${YELLOW}📝 Criando ambiente '${ENVIRONMENT_NAME}'...${NC}"
    CREATE_ENV_RESPONSE=$(curl -s -X POST "${API_URL}/organizations/${ORGANIZATION_UUID}/environments/" \
        -H "Content-Type: application/json" \
        -H "x-tron-token: ${API_TOKEN}" \
        -d "{\"name\": \"${ENVIRONMENT_NAME}\"}")

    ENVIRONMENT_UUID=$(echo "$CREATE_ENV_RESPONSE" | jq -r '.uuid // empty')

    if [ -z "$ENVIRONMENT_UUID" ] || [ "$ENVIRONMENT_UUID" = "null" ]; then
        echo -e "${RED}❌ Erro ao criar ambiente${NC}"
        echo "$CREATE_ENV_RESPONSE"
        exit 1
    fi

    echo -e "${GREEN}✓ Ambiente '${ENVIRONMENT_NAME}' criado${NC}"
fi

# Verificar/criar ServiceAccount e obter token
echo -e "${YELLOW}🔍 Verificando ServiceAccount '${SERVICE_ACCOUNT_NAME}'...${NC}"

# Verificar se kubectl está disponível e se o kubeconfig existe
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}⚠️  kubectl não encontrado. Pulando criação do cluster${NC}"
    CLUSTER_TOKEN=""
elif [ ! -f "$KUBECONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠️  Kubeconfig não encontrado em ${KUBECONFIG_FILE}. Pulando criação do cluster${NC}"
    CLUSTER_TOKEN=""
else
    # Extrair api_address do kubeconfig se não foi definido
    if [ -z "$CLUSTER_API_ADDRESS" ] || [ "$CLUSTER_API_ADDRESS" = "https://127.0.0.1:6443" ]; then
        CLUSTER_API_ADDRESS=$(kubectl --kubeconfig="${KUBECONFIG_FILE}" config view -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null)
        if [ -z "$CLUSTER_API_ADDRESS" ]; then
            CLUSTER_API_ADDRESS="https://127.0.0.1:5443"
        fi
        echo -e "${GREEN}✓ API address extraído do kubeconfig: ${CLUSTER_API_ADDRESS}${NC}"
    fi
    # Verificar se ServiceAccount existe
    if ! kubectl --kubeconfig="${KUBECONFIG_FILE}" -n "${SERVICE_ACCOUNT_NAMESPACE}" get sa "${SERVICE_ACCOUNT_NAME}" &>/dev/null; then
        echo -e "${YELLOW}📝 Criando ServiceAccount '${SERVICE_ACCOUNT_NAME}'...${NC}"
        kubectl --kubeconfig="${KUBECONFIG_FILE}" -n "${SERVICE_ACCOUNT_NAMESPACE}" create sa "${SERVICE_ACCOUNT_NAME}"

        # Criar Secret
        kubectl --kubeconfig="${KUBECONFIG_FILE}" -n "${SERVICE_ACCOUNT_NAMESPACE}" apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ${SERVICE_ACCOUNT_NAME}
  annotations:
    kubernetes.io/service-account.name: ${SERVICE_ACCOUNT_NAME}
type: kubernetes.io/service-account-token
EOF

        # Criar ClusterRoleBinding
        kubectl --kubeconfig="${KUBECONFIG_FILE}" -n "${SERVICE_ACCOUNT_NAMESPACE}" create clusterrolebinding "${SERVICE_ACCOUNT_NAME}" \
            --clusterrole=cluster-admin \
            --serviceaccount="${SERVICE_ACCOUNT_NAMESPACE}:${SERVICE_ACCOUNT_NAME}" \
            --dry-run=client -o yaml | kubectl --kubeconfig="${KUBECONFIG_FILE}" apply -f -

        echo -e "${GREEN}✓ ServiceAccount criado${NC}"
    else
        echo -e "${GREEN}✓ ServiceAccount já existe${NC}"
    fi

    # Aguardar o token ser gerado
    echo -e "${YELLOW}⏳ Aguardando token do ServiceAccount...${NC}"
    for i in {1..30}; do
        TOKEN_B64=$(kubectl --kubeconfig="${KUBECONFIG_FILE}" -n "${SERVICE_ACCOUNT_NAMESPACE}" get secret "${SERVICE_ACCOUNT_NAME}" -o jsonpath='{.data.token}' 2>/dev/null)
        if [ -n "$TOKEN_B64" ]; then
            # Decodificar base64 (tentar -d primeiro, depois -D para compatibilidade)
            CLUSTER_TOKEN=$(echo "$TOKEN_B64" | base64 -d 2>/dev/null || echo "$TOKEN_B64" | base64 -D 2>/dev/null)
            if [ -n "$CLUSTER_TOKEN" ]; then
                break
            fi
        fi
        sleep 1
    done

    if [ -z "$CLUSTER_TOKEN" ]; then
        echo -e "${RED}❌ Não foi possível obter token do ServiceAccount${NC}"
        CLUSTER_TOKEN=""
    else
        echo -e "${GREEN}✓ Token do ServiceAccount obtido${NC}"
    fi
fi

# Verificar/criar cluster
echo -e "${YELLOW}🔍 Verificando cluster '${CLUSTER_NAME}'...${NC}"
CLUSTERS_RESPONSE=$(curl -s -X GET "${API_URL}/organizations/${ORGANIZATION_UUID}/clusters/" \
    -H "x-tron-token: ${API_TOKEN}")

CLUSTER_UUID=$(echo "$CLUSTERS_RESPONSE" | jq -r ".[] | select(.name == \"${CLUSTER_NAME}\") | .uuid" 2>/dev/null | head -1)

if [ -n "$CLUSTER_UUID" ] && [ "$CLUSTER_UUID" != "null" ]; then
    echo -e "${GREEN}✓ Cluster '${CLUSTER_NAME}' já existe (UUID: ${CLUSTER_UUID})${NC}"

    if [ -n "$CLUSTER_TOKEN" ]; then
        echo -e "${YELLOW}📝 Atualizando token do cluster...${NC}"
        UPDATE_CLUSTER_RESPONSE=$(curl -s -X PUT "${API_URL}/organizations/${ORGANIZATION_UUID}/clusters/${CLUSTER_UUID}" \
            -H "Content-Type: application/json" \
            -H "x-tron-token: ${API_TOKEN}" \
            -d "{
                \"name\": \"${CLUSTER_NAME}\",
                \"api_address\": \"${CLUSTER_API_ADDRESS}\",
                \"token\": \"${CLUSTER_TOKEN}\",
                \"environment_uuid\": \"${ENVIRONMENT_UUID}\"
            }")

        # Check if update was successful
        UPDATED_UUID=$(echo "$UPDATE_CLUSTER_RESPONSE" | jq -r '.uuid // empty' 2>/dev/null)
        if [ -n "$UPDATED_UUID" ] && [ "$UPDATED_UUID" != "null" ]; then
            echo -e "${GREEN}✓ Cluster '${CLUSTER_NAME}' atualizado com sucesso${NC}"
        else
            echo -e "${YELLOW}⚠️  Não foi possível atualizar o cluster (já pode estar atualizado)${NC}"
        fi
    fi
else
    if [ -z "$CLUSTER_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  Token do cluster não disponível. Pulando criação do cluster${NC}"
    else
        echo -e "${YELLOW}📝 Criando cluster '${CLUSTER_NAME}'...${NC}"
        CREATE_CLUSTER_RESPONSE=$(curl -s -X POST "${API_URL}/organizations/${ORGANIZATION_UUID}/clusters/" \
            -H "Content-Type: application/json" \
            -H "x-tron-token: ${API_TOKEN}" \
            -d "{
                \"name\": \"${CLUSTER_NAME}\",
                \"api_address\": \"${CLUSTER_API_ADDRESS}\",
                \"token\": \"${CLUSTER_TOKEN}\",
                \"environment_uuid\": \"${ENVIRONMENT_UUID}\"
            }")

        CLUSTER_UUID=$(echo "$CREATE_CLUSTER_RESPONSE" | jq -r '.uuid // empty' 2>/dev/null)

        if [ -z "$CLUSTER_UUID" ] || [ "$CLUSTER_UUID" = "null" ]; then
            echo -e "${RED}❌ Erro ao criar cluster${NC}"
            echo "$CREATE_CLUSTER_RESPONSE"
            exit 1
        fi

        echo -e "${GREEN}✓ Cluster '${CLUSTER_NAME}' criado${NC}"
    fi
fi

echo -e "${GREEN}🎉 Concluído!${NC}"

