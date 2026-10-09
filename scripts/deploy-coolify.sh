#!/usr/bin/env bash
# UTF-8
# Dispara o deploy de uma aplicacao no Coolify e acompanha ate terminar.
#
# RODA NA VPS. Duas razoes, as duas medidas em 2026-09-06:
#   1. A API do Coolify tem allowlist de IPs (127.0.0.1/32 e o IP da VPS). O runner do
#      GitHub tem IP dinamico da Azure e leva "You are not allowed to access the API.".
#      Abrir a allowlist para a faixa do GitHub seria expor a API de deploy a milhares de
#      IPs de terceiros.
#   2. Mesmo de dentro da VPS, chamar http://127.0.0.1:8000 nao serve: o docker-proxy
#      reescreve a origem para o gateway da bridge e o Laravel ve esse IP. Por isso o
#      curl roda DENTRO do container `coolify`, onde a origem e o loopback de verdade.
#
# O token entra pela PRIMEIRA LINHA do stdin: nao aparece em `ps` nem fica em disco.
#
# Uso:
#   printf '%s\n' "$COOLIFY_API_TOKEN" | bash deploy-coolify.sh <uuid-da-aplicacao>
#
# Sai 0 no sucesso; != 0 se o deploy falhar ou estourar o tempo. Quando o
# pre-deployment (as migracoes) falha, o Coolify aborta e o container ANTIGO continua
# servindo: por isso falhar aqui e seguro.
#
# PRE-REQUISITO na aplicacao, aprendido no primeiro deploy real (2026-09-08): o campo
# "Pre-deployment Command" so roda se o campo AO LADO dele, o do container, estiver
# preenchido com o uuid da aplicacao. Vazio, o Coolify ignora o comando EM SILENCIO,
# deploya assim mesmo, e o container novo sobe batendo em "Unknown column" a cada
# consulta. Nao ha aviso no log do deployment.
set -euo pipefail

UUID="${1:-}"
[ -n "$UUID" ] || { echo "uso: deploy-coolify.sh <uuid-da-aplicacao>"; exit 2; }

read -r TOKEN
[ -n "$TOKEN" ] || { echo "ERRO: nenhum token na primeira linha do stdin."; exit 2; }

TENTATIVAS="${DEPLOY_TENTATIVAS:-40}"   # 40 x 15s = 10 min
INTERVALO="${DEPLOY_INTERVALO:-15}"

# O verbo importa: /api/v1/deploy passou a exigir POST (o Coolify responde
# "This endpoint has changed to a POST request." se for GET), enquanto
# /api/v1/deployments/<uuid> continua sendo GET.
api() {
  metodo="${2:-GET}"
  docker exec -i coolify sh -c \
    "curl -sS -m 60 -X ${metodo} -H 'Authorization: Bearer ${TOKEN}' 'http://127.0.0.1:8080$1'"
}

# grep em vez de jq: a imagem do Coolify nao tem jq, e depender de uma ferramenta a mais
# so para ler um campo tornaria o deploy refem dela.
campo() { grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }

# A resposta de /deployments/<uuid> traz TRES campos "status": o da aplicacao
# ("running:healthy"), o de um container sendo removido, e o do deployment em si.
# Pegar "o primeiro status" devolvia o da aplicacao, que nunca muda para "finished",
# e o script dava timeout depois de um deploy que tinha dado certo. Como os estados do
# deployment nao colidem com os da aplicacao, testar a presenca do valor exato e o
# jeito mais simples de nao errar de campo.
tem_status() { printf '%s' "$1" | grep -q "\"status\":\"$2\""; }

echo "==> Disparando deploy de ${UUID}"
RESP=$(api "/api/v1/deploy?uuid=${UUID}&force=false" POST)
echo "${RESP}"

DEP=$(printf '%s' "${RESP}" | campo deployment_uuid)
if [ -z "${DEP}" ]; then
  echo "ERRO: o Coolify aceitou a chamada mas nao devolveu deployment_uuid."
  exit 1
fi
echo "==> deployment ${DEP}"

for i in $(seq 1 "${TENTATIVAS}"); do
  RESP_ST=$(api "/api/v1/deployments/${DEP}")
  # Resposta sem nenhum "status" e erro da API, nao deploy em andamento. Medido em
  # 2026-09-30: um token so com "deploy" e "write" dispara o deploy mas nao pode LER o
  # status; o script esperava 10 minutos achando que o build nao acabava, com o site ja no ar.
  if ! printf '%s' "${RESP_ST}" | grep -q '"status"'; then
    echo "ERRO: a consulta do deployment nao devolveu status: $(printf '%s' "${RESP_ST}" | head -c 300)"
    echo "O token precisa das permissoes 'deploy' E 'read' no Coolify (Keys & Tokens)."
    exit 1
  fi
  if tem_status "${RESP_ST}" "finished"; then
    echo "[${i}/${TENTATIVAS}] finished"
    echo "==> Deploy concluido."
    exit 0
  fi
  for ruim in failed error cancelled-by-user; do
    if tem_status "${RESP_ST}" "${ruim}"; then
      echo "[${i}/${TENTATIVAS}] ${ruim}"
      echo "ERRO: o deploy terminou como '${ruim}'."
      echo "Se a falha foi no pre-deployment, as migracoes nao passaram e o container"
      echo "ANTIGO continua servindo. O log completo esta no painel do Coolify."
      exit 1
    fi
  done
  echo "[${i}/${TENTATIVAS}] em andamento"
  sleep "${INTERVALO}"
done

echo "ERRO: o deploy nao terminou em $(( TENTATIVAS * INTERVALO / 60 )) minutos."
exit 1
