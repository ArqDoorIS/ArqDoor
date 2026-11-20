/**
 * Respostas REAIS do backend de notificações (arqdoor-backend-notif, 20/11/2026).
 *
 * PAINEL_REAL e GATILHOS_REAIS foram gerados rodando o próprio código do backend
 * (catalogo.js + modelos-de-email.listar + condicoes.publicas; regra = regras.mesclar(tipo, null)), com um
 * subconjunto de eventos. Só uma troca: aqui não há o pacote mjml, então os modelos .mjml
 * vinham com status "erro"; no deploy eles compilam, por isso ficam "ok".
 *
 * O resto segue à mão os controllers/serviços:
 *   adminNotificacoesController.js  previa, teste, envios, personalizadas, config
 *   envios.js listarEnvios           linhas cruas do banco (underscored: created_at/updated_at, sino_ok...)
 *   personalizadas.js listar/historico/apagar   { personalizadas_ligadas, personalizadas } / { agendadas } / { apagada, pausada, pendentes, message }
 */
/* eslint-disable */
export const PAINEL_REAL = {
 "success": true,
 "eventos": [
  {
   "tipo": "step_delivered",
   "grupo": "Contratos e fases",
   "rotulo": "Fase entregue",
   "quando": "Quando o profissional marca uma fase como entregue.",
   "para": "cliente",
   "variaveis": [
    {
     "chave": "nome",
     "descricao": "Primeiro nome de quem recebe",
     "exemplo": "Ana"
    },
    {
     "chave": "titulo_original",
     "descricao": "Título que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "texto_original",
     "descricao": "Texto que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "fase",
     "descricao": "Nome da fase do contrato",
     "exemplo": "Projeto executivo"
    }
   ],
   "padrao": {
    "sino": true,
    "push": true,
    "email": true,
    "email_modelo": "legado",
    "anexos": []
   },
   "original": {
    "titulo": "Etapa Entregue! 🚀",
    "texto": "O prestador entregou a etapa Projeto executivo. Acesse para revisar e assinar."
   },
   "papeis": [
    "cliente"
   ],
   "ids": [
    "ticket_id",
    "step_id",
    "cliente_id",
    "profissional_id"
   ],
   "anexos_possiveis": [],
   "seguranca": false,
   "email_obrigatorio": false,
   "editavel": true,
   "regra": {
    "tipo": "step_delivered",
    "ativo": true,
    "sino": true,
    "push": true,
    "email": true,
    "titulo": null,
    "texto": null,
    "email_modelo": "legado",
    "email_campos": null,
    "anexos": []
   },
   "personalizado": false
  },
  {
   "tipo": "visit_proposed",
   "grupo": "Visitas",
   "rotulo": "Visita proposta",
   "quando": "Quando o profissional propõe uma visita.",
   "para": "cliente",
   "variaveis": [
    {
     "chave": "nome",
     "descricao": "Primeiro nome de quem recebe",
     "exemplo": "Ana"
    },
    {
     "chave": "titulo_original",
     "descricao": "Título que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "texto_original",
     "descricao": "Texto que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "profissional",
     "descricao": "Nome do profissional",
     "exemplo": "Carlos"
    },
    {
     "chave": "data_visita",
     "descricao": "Data e hora da visita",
     "exemplo": "25/11/2026 às 14:00"
    },
    {
     "chave": "numero_visita",
     "descricao": "Número da visita",
     "exemplo": "128"
    }
   ],
   "padrao": {
    "sino": true,
    "push": true,
    "email": true,
    "email_modelo": "legado",
    "anexos": []
   },
   "original": {
    "titulo": "Nova visita proposta",
    "texto": "Carlos propôs uma visita. Confirme a data e o horário no aplicativo."
   },
   "papeis": [
    "cliente"
   ],
   "ids": [
    "visita_id",
    "cliente_id",
    "profissional_id"
   ],
   "anexos_possiveis": [
    "ics_visita"
   ],
   "seguranca": false,
   "email_obrigatorio": false,
   "editavel": true,
   "regra": {
    "tipo": "visit_proposed",
    "ativo": true,
    "sino": true,
    "push": true,
    "email": true,
    "titulo": null,
    "texto": null,
    "email_modelo": "legado",
    "email_campos": null,
    "anexos": []
   },
   "personalizado": false
  },
  {
   "tipo": "proposal_created",
   "grupo": "Contratos e fases",
   "rotulo": "Proposta recebida",
   "quando": "Quando o profissional manda uma proposta nova ao cliente.",
   "para": "cliente",
   "variaveis": [
    {
     "chave": "nome",
     "descricao": "Primeiro nome de quem recebe",
     "exemplo": "Ana"
    },
    {
     "chave": "titulo_original",
     "descricao": "Título que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "texto_original",
     "descricao": "Texto que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "numero_proposta",
     "descricao": "Número da proposta",
     "exemplo": "45"
    }
   ],
   "padrao": {
    "sino": true,
    "push": false,
    "email": false,
    "email_modelo": "legado",
    "anexos": []
   },
   "original": {
    "titulo": "Nova proposta recebida",
    "texto": "A proposta #45 foi criada e está pronta para sua revisão."
   },
   "papeis": [
    "cliente"
   ],
   "ids": [
    "ticket_id",
    "cliente_id",
    "profissional_id"
   ],
   "anexos_possiveis": [
    "pdf_proposta"
   ],
   "seguranca": false,
   "email_obrigatorio": false,
   "editavel": true,
   "regra": {
    "tipo": "proposal_created",
    "ativo": true,
    "sino": true,
    "push": false,
    "email": false,
    "titulo": null,
    "texto": null,
    "email_modelo": "legado",
    "email_campos": null,
    "anexos": []
   },
   "personalizado": false
  },
  {
   "tipo": "conta.redefinir_senha",
   "grupo": "Conta e acesso",
   "rotulo": "Link para redefinir a senha",
   "quando": "Quando alguém pede \"esqueci a senha\" para uma conta com senha.",
   "para": "ambos",
   "variaveis": [
    {
     "chave": "nome",
     "descricao": "Primeiro nome de quem recebe",
     "exemplo": "Ana"
    },
    {
     "chave": "titulo_original",
     "descricao": "Título que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "texto_original",
     "descricao": "Texto que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "link_redefinicao",
     "descricao": "Link para criar a senha nova (vale 1 hora)",
     "exemplo": "https://arqdoor.com/nova-senha?token=exemplo&id=1",
     "obrigatoria": true
    },
    {
     "chave": "email",
     "descricao": "E-mail da conta",
     "exemplo": "ana@exemplo.com"
    }
   ],
   "padrao": {
    "sino": false,
    "push": false,
    "email": true,
    "email_modelo": "redefinir_senha",
    "anexos": []
   },
   "original": {
    "titulo": "Redefinição de senha - ArqDoor",
    "texto": "Recebemos uma solicitação para redefinir a senha da sua conta ana@exemplo.com. O link expira em 1 hora: https://arqdoor.com/nova-senha?token=exemplo&id=1"
   },
   "papeis": [
    "cliente",
    "profissional"
   ],
   "ids": [],
   "anexos_possiveis": [],
   "seguranca": true,
   "email_obrigatorio": true,
   "editavel": true,
   "regra": {
    "tipo": "conta.redefinir_senha",
    "ativo": true,
    "sino": false,
    "push": false,
    "email": true,
    "titulo": null,
    "texto": null,
    "email_modelo": "redefinir_senha",
    "email_campos": null,
    "anexos": []
   },
   "personalizado": false
  },
  {
   "tipo": "conta.codigo_admin",
   "grupo": "Conta e acesso",
   "rotulo": "Código de acesso ao painel",
   "quando": "Quando um membro do painel entra por um dispositivo novo. Só para a equipe; não se edita pelo painel.",
   "para": "ambos",
   "variaveis": [
    {
     "chave": "nome",
     "descricao": "Primeiro nome de quem recebe",
     "exemplo": "Ana"
    },
    {
     "chave": "titulo_original",
     "descricao": "Título que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "texto_original",
     "descricao": "Texto que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "codigo",
     "descricao": "Código de 6 dígitos",
     "exemplo": "123456",
     "obrigatoria": true
    }
   ],
   "padrao": {
    "sino": false,
    "push": false,
    "email": true,
    "email_modelo": "nenhum",
    "anexos": []
   },
   "original": {
    "titulo": "Código de acesso ao painel ArqDoor: 123456",
    "texto": "Alguém entrou com a sua senha em um dispositivo que ainda não conhecemos. Se foi você, use o código 123456."
   },
   "papeis": [
    "cliente",
    "profissional"
   ],
   "ids": [],
   "anexos_possiveis": [],
   "seguranca": true,
   "email_obrigatorio": true,
   "editavel": false,
   "regra": {
    "tipo": "conta.codigo_admin",
    "ativo": true,
    "sino": false,
    "push": false,
    "email": true,
    "titulo": null,
    "texto": null,
    "email_modelo": "nenhum",
    "email_campos": null,
    "anexos": []
   },
   "personalizado": false
  }
 ],
 "modelos": [
  {
   "chave": "com_botao",
   "rotulo": "Com botão",
   "descricao": "Título, texto e um botão que leva à página da notificação no site.",
   "formato": "mjml",
   "arquivo": "com_botao.mjml",
   "campos": [
    {
     "chave": "assunto",
     "rotulo": "Assunto",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "{titulo}",
     "ajuda": "Linha de assunto do e-mail. Vazio = o título da notificação.",
     "aceita_variaveis": true
    },
    {
     "chave": "pre_cabecalho",
     "rotulo": "Pré-cabeçalho",
     "tipo": "texto",
     "obrigatorio": false,
     "padrao": "",
     "ajuda": "Frase curta que aparece ao lado do assunto na caixa de entrada.",
     "aceita_variaveis": true
    },
    {
     "chave": "mostrar_logo",
     "rotulo": "Mostrar o nome ArqDoor no topo",
     "tipo": "booleano",
     "obrigatorio": false,
     "padrao": true,
     "ajuda": "O nome em texto, na cor de destaque.",
     "aceita_variaveis": false
    },
    {
     "chave": "imagem_topo_url",
     "rotulo": "Imagem do topo",
     "tipo": "imagem_url",
     "obrigatorio": false,
     "padrao": "",
     "ajuda": "Endereço https de uma imagem. Vazio: sem imagem.",
     "aceita_variaveis": false
    },
    {
     "chave": "cor_destaque",
     "rotulo": "Cor de destaque",
     "tipo": "cor",
     "obrigatorio": false,
     "padrao": "#e75812",
     "ajuda": "No formato #RRGGBB.",
     "aceita_variaveis": false
    },
    {
     "chave": "titulo",
     "rotulo": "Título",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "{titulo}",
     "ajuda": "Vazio = o título da notificação.",
     "aceita_variaveis": true
    },
    {
     "chave": "saudacao",
     "rotulo": "Saudação",
     "tipo": "texto",
     "obrigatorio": false,
     "padrao": "Olá, {nome}",
     "ajuda": "\"\" = sem saudação.",
     "aceita_variaveis": true
    },
    {
     "chave": "texto",
     "rotulo": "Texto",
     "tipo": "texto_longo",
     "obrigatorio": true,
     "padrao": "{texto}",
     "ajuda": "Vazio = o texto da notificação. Quebras de linha são mantidas.",
     "aceita_variaveis": true
    },
    {
     "chave": "rodape",
     "rotulo": "Rodapé",
     "tipo": "texto_longo",
     "obrigatorio": false,
     "padrao": "Abra o aplicativo ArqDoor para ver os detalhes.",
     "ajuda": "Texto pequeno no fim do e-mail. \"\" = sem rodapé.",
     "aceita_variaveis": true
    },
    {
     "chave": "botao_rotulo",
     "rotulo": "Texto do botão",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "Abrir na ArqDoor",
     "ajuda": "Curto, de preferência com um verbo.",
     "aceita_variaveis": true
    },
    {
     "chave": "botao_link",
     "rotulo": "Link do botão",
     "tipo": "url",
     "obrigatorio": true,
     "padrao": "{link}",
     "ajuda": "{link} abre no site a mesma página da notificação. Aceita https://... ou /rota-do-site.",
     "aceita_variaveis": true
    }
   ],
   "variaveis_do_molde": [],
   "status": "ok"
  },
  {
   "chave": "destaque",
   "rotulo": "Destaque",
   "descricao": "Texto dentro de um cartão com borda colorida, para avisos que a pessoa não pode perder.",
   "formato": "mjml",
   "arquivo": "destaque.mjml",
   "campos": [
    {
     "chave": "assunto",
     "rotulo": "Assunto",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "{titulo}",
     "ajuda": "Linha de assunto do e-mail. Vazio = o título da notificação.",
     "aceita_variaveis": true
    },
    {
     "chave": "pre_cabecalho",
     "rotulo": "Pré-cabeçalho",
     "tipo": "texto",
     "obrigatorio": false,
     "padrao": "",
     "ajuda": "Frase curta que aparece ao lado do assunto na caixa de entrada.",
     "aceita_variaveis": true
    },
    {
     "chave": "mostrar_logo",
     "rotulo": "Mostrar o nome ArqDoor no topo",
     "tipo": "booleano",
     "obrigatorio": false,
     "padrao": true,
     "ajuda": "O nome em texto, na cor de destaque.",
     "aceita_variaveis": false
    },
    {
     "chave": "imagem_topo_url",
     "rotulo": "Imagem do topo",
     "tipo": "imagem_url",
     "obrigatorio": false,
     "padrao": "",
     "ajuda": "Endereço https de uma imagem. Vazio: sem imagem.",
     "aceita_variaveis": false
    },
    {
     "chave": "cor_destaque",
     "rotulo": "Cor de destaque",
     "tipo": "cor",
     "obrigatorio": false,
     "padrao": "#e75812",
     "ajuda": "No formato #RRGGBB.",
     "aceita_variaveis": false
    },
    {
     "chave": "titulo",
     "rotulo": "Título",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "{titulo}",
     "ajuda": "Vazio = o título da notificação.",
     "aceita_variaveis": true
    },
    {
     "chave": "saudacao",
     "rotulo": "Saudação",
     "tipo": "texto",
     "obrigatorio": false,
     "padrao": "Olá, {nome}",
     "ajuda": "\"\" = sem saudação.",
     "aceita_variaveis": true
    },
    {
     "chave": "texto",
     "rotulo": "Texto",
     "tipo": "texto_longo",
     "obrigatorio": true,
     "padrao": "{texto}",
     "ajuda": "Vazio = o texto da notificação. Quebras de linha são mantidas.",
     "aceita_variaveis": true
    },
    {
     "chave": "rodape",
     "rotulo": "Rodapé",
     "tipo": "texto_longo",
     "obrigatorio": false,
     "padrao": "Abra o aplicativo ArqDoor para ver os detalhes.",
     "ajuda": "Texto pequeno no fim do e-mail. \"\" = sem rodapé.",
     "aceita_variaveis": true
    },
    {
     "chave": "tipo_aviso",
     "rotulo": "Tipo de aviso",
     "tipo": "opcoes",
     "opcoes": [
      {
       "valor": "info",
       "rotulo": "Informação"
      },
      {
       "valor": "atencao",
       "rotulo": "Atenção"
      },
      {
       "valor": "sucesso",
       "rotulo": "Sucesso"
      }
     ],
     "obrigatorio": true,
     "padrao": "atencao",
     "ajuda": "Muda o ícone e as cores do cartão.",
     "aceita_variaveis": false
    },
    {
     "chave": "mostrar_icone",
     "rotulo": "Mostrar ícone",
     "tipo": "booleano",
     "obrigatorio": false,
     "padrao": true,
     "ajuda": "Ícone antes do título do cartão.",
     "aceita_variaveis": false
    },
    {
     "chave": "botao_rotulo",
     "rotulo": "Texto do botão",
     "tipo": "texto",
     "obrigatorio": false,
     "padrao": "",
     "ajuda": "Vazio: sem botão.",
     "aceita_variaveis": true
    },
    {
     "chave": "botao_link",
     "rotulo": "Link do botão",
     "tipo": "url",
     "obrigatorio": false,
     "padrao": "{link}",
     "ajuda": "{link} abre no site a mesma página da notificação.",
     "aceita_variaveis": true
    }
   ],
   "variaveis_do_molde": [],
   "status": "ok"
  },
  {
   "chave": "legado",
   "rotulo": "ArqDoor (o de sempre)",
   "descricao": "O e-mail que a ArqDoor sempre mandou nas notificações: título laranja, \"Olá, nome\", o texto e o rodapé. É o padrão de todos os eventos.",
   "formato": "html",
   "arquivo": "legado.html",
   "campos": [
    {
     "chave": "assunto",
     "rotulo": "Assunto",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "{titulo}",
     "ajuda": "Vazio = o título da notificação.",
     "aceita_variaveis": true
    },
    {
     "chave": "titulo",
     "rotulo": "Título",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "{titulo}",
     "ajuda": "Vazio = o título da notificação.",
     "aceita_variaveis": true
    },
    {
     "chave": "texto",
     "rotulo": "Texto",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "{texto}",
     "ajuda": "Vazio = o texto da notificação.",
     "aceita_variaveis": true
    }
   ],
   "variaveis_do_molde": [
    "nome_completo"
   ],
   "status": "ok"
  },
  {
   "chave": "lembrete_telefone",
   "rotulo": "Lembrete de telefone (o de sempre)",
   "descricao": "O pedido para completar o telefone no cadastro, igual ao que a ArqDoor sempre mandou. Usa {{nome_completo}} e {{link_perfil}} do evento.",
   "formato": "html",
   "arquivo": "lembrete_telefone.html",
   "campos": [
    {
     "chave": "assunto",
     "rotulo": "Assunto",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "Complete seu cadastro no ArqDoor",
     "ajuda": "Linha de assunto do e-mail.",
     "aceita_variaveis": true
    }
   ],
   "variaveis_do_molde": [
    "nome_completo",
    "link_perfil"
   ],
   "status": "ok",
   "avisos": [
    "{{link_perfil}} não é campo: precisa vir como variável do evento."
   ]
  },
  {
   "chave": "redefinir_senha",
   "rotulo": "Redefinição de senha (o de sempre)",
   "descricao": "O e-mail com o link para criar uma senha nova, igual ao que a ArqDoor sempre mandou. Usa {{email}} e {{link_redefinicao}} do evento.",
   "formato": "html",
   "arquivo": "redefinir_senha.html",
   "campos": [
    {
     "chave": "assunto",
     "rotulo": "Assunto",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "Redefinição de senha - ArqDoor",
     "ajuda": "Linha de assunto do e-mail.",
     "aceita_variaveis": true
    }
   ],
   "variaveis_do_molde": [
    "email",
    "link_redefinicao"
   ],
   "status": "ok",
   "avisos": [
    "{{email}} não é campo: precisa vir como variável do evento.",
    "{{link_redefinicao}} não é campo: precisa vir como variável do evento."
   ]
  },
  {
   "chave": "senha_alterada",
   "rotulo": "Senha alterada (o de sempre)",
   "descricao": "O aviso de que a senha foi trocada, igual ao que a ArqDoor sempre mandou. Usa {{nome_completo}} e {{email}} do evento.",
   "formato": "html",
   "arquivo": "senha_alterada.html",
   "campos": [
    {
     "chave": "assunto",
     "rotulo": "Assunto",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "Sua senha foi alterada - ArqDoor",
     "ajuda": "Linha de assunto do e-mail.",
     "aceita_variaveis": true
    }
   ],
   "variaveis_do_molde": [
    "nome_completo",
    "email"
   ],
   "status": "ok",
   "avisos": [
    "{{email}} não é campo: precisa vir como variável do evento."
   ]
  },
  {
   "chave": "simples",
   "rotulo": "Simples",
   "descricao": "Título, saudação e texto. É o e-mail que a ArqDoor sempre mandou.",
   "formato": "mjml",
   "arquivo": "simples.mjml",
   "campos": [
    {
     "chave": "assunto",
     "rotulo": "Assunto",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "{titulo}",
     "ajuda": "Linha de assunto do e-mail. Vazio = o título da notificação.",
     "aceita_variaveis": true
    },
    {
     "chave": "pre_cabecalho",
     "rotulo": "Pré-cabeçalho",
     "tipo": "texto",
     "obrigatorio": false,
     "padrao": "",
     "ajuda": "Frase curta que aparece ao lado do assunto na caixa de entrada.",
     "aceita_variaveis": true
    },
    {
     "chave": "mostrar_logo",
     "rotulo": "Mostrar o nome ArqDoor no topo",
     "tipo": "booleano",
     "obrigatorio": false,
     "padrao": true,
     "ajuda": "O nome em texto, na cor de destaque.",
     "aceita_variaveis": false
    },
    {
     "chave": "imagem_topo_url",
     "rotulo": "Imagem do topo",
     "tipo": "imagem_url",
     "obrigatorio": false,
     "padrao": "",
     "ajuda": "Endereço https de uma imagem. Vazio: sem imagem.",
     "aceita_variaveis": false
    },
    {
     "chave": "cor_destaque",
     "rotulo": "Cor de destaque",
     "tipo": "cor",
     "obrigatorio": false,
     "padrao": "#e75812",
     "ajuda": "No formato #RRGGBB.",
     "aceita_variaveis": false
    },
    {
     "chave": "titulo",
     "rotulo": "Título",
     "tipo": "texto",
     "obrigatorio": true,
     "padrao": "{titulo}",
     "ajuda": "Vazio = o título da notificação.",
     "aceita_variaveis": true
    },
    {
     "chave": "saudacao",
     "rotulo": "Saudação",
     "tipo": "texto",
     "obrigatorio": false,
     "padrao": "Olá, {nome}",
     "ajuda": "\"\" = sem saudação.",
     "aceita_variaveis": true
    },
    {
     "chave": "texto",
     "rotulo": "Texto",
     "tipo": "texto_longo",
     "obrigatorio": true,
     "padrao": "{texto}",
     "ajuda": "Vazio = o texto da notificação. Quebras de linha são mantidas.",
     "aceita_variaveis": true
    },
    {
     "chave": "rodape",
     "rotulo": "Rodapé",
     "tipo": "texto_longo",
     "obrigatorio": false,
     "padrao": "Abra o aplicativo ArqDoor para ver os detalhes.",
     "ajuda": "Texto pequeno no fim do e-mail. \"\" = sem rodapé.",
     "aceita_variaveis": true
    }
   ],
   "variaveis_do_molde": [],
   "status": "ok"
  },
  {
   "chave": "nenhum",
   "rotulo": "Sem e-mail",
   "descricao": "Não manda e-mail para este evento.",
   "formato": null,
   "arquivo": null,
   "campos": [],
   "variaveis_do_molde": [],
   "status": "ok"
  }
 ],
 "grupos": [
  "Mensagens",
  "Contratos e fases",
  "Pagamentos",
  "Pedidos e convites",
  "Visitas",
  "Conta",
  "Conta e acesso",
  "Plataforma"
 ],
 "anexos": {
  "ics_visita": {
   "rotulo": "Convite de calendário (.ics)",
   "descricao": "A visita entra na agenda de quem recebe, com data, hora e endereço."
  },
  "pdf_contrato": {
   "rotulo": "PDF do contrato",
   "descricao": "O contrato em PDF (o assinado, quando já existe)."
  },
  "pdf_proposta": {
   "rotulo": "PDF da proposta",
   "descricao": "A proposta em PDF que o profissional enviou."
  }
 },
 "sobras": {}
};

export const GATILHOS_REAIS = {
 "success": true,
 "eventos": [
  {
   "tipo": "step_delivered",
   "rotulo": "Fase entregue",
   "grupo": "Contratos e fases",
   "quando": "Quando o profissional marca uma fase como entregue.",
   "papeis": [
    "cliente"
   ],
   "ids": [
    "ticket_id",
    "step_id",
    "cliente_id",
    "profissional_id"
   ],
   "variaveis": [
    {
     "chave": "nome",
     "descricao": "Primeiro nome de quem recebe",
     "exemplo": "Ana"
    },
    {
     "chave": "titulo_original",
     "descricao": "Título que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "texto_original",
     "descricao": "Texto que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "fase",
     "descricao": "Nome da fase do contrato",
     "exemplo": "Projeto executivo"
    }
   ]
  },
  {
   "tipo": "visit_proposed",
   "rotulo": "Visita proposta",
   "grupo": "Visitas",
   "quando": "Quando o profissional propõe uma visita.",
   "papeis": [
    "cliente"
   ],
   "ids": [
    "visita_id",
    "cliente_id",
    "profissional_id"
   ],
   "variaveis": [
    {
     "chave": "nome",
     "descricao": "Primeiro nome de quem recebe",
     "exemplo": "Ana"
    },
    {
     "chave": "titulo_original",
     "descricao": "Título que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "texto_original",
     "descricao": "Texto que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "profissional",
     "descricao": "Nome do profissional",
     "exemplo": "Carlos"
    },
    {
     "chave": "data_visita",
     "descricao": "Data e hora da visita",
     "exemplo": "25/11/2026 às 14:00"
    },
    {
     "chave": "numero_visita",
     "descricao": "Número da visita",
     "exemplo": "128"
    }
   ]
  },
  {
   "tipo": "visit_cancelled",
   "rotulo": "Visita cancelada",
   "grupo": "Visitas",
   "quando": "Quando a visita é cancelada.",
   "papeis": [
    "cliente",
    "profissional"
   ],
   "ids": [
    "visita_id",
    "cliente_id",
    "profissional_id"
   ],
   "variaveis": [
    {
     "chave": "nome",
     "descricao": "Primeiro nome de quem recebe",
     "exemplo": "Ana"
    },
    {
     "chave": "titulo_original",
     "descricao": "Título que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "texto_original",
     "descricao": "Texto que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "data_visita",
     "descricao": "Data e hora da visita",
     "exemplo": "25/11/2026 às 14:00"
    },
    {
     "chave": "numero_visita",
     "descricao": "Número da visita",
     "exemplo": "128"
    }
   ]
  },
  {
   "tipo": "proposal_created",
   "rotulo": "Proposta recebida",
   "grupo": "Contratos e fases",
   "quando": "Quando o profissional manda uma proposta nova ao cliente.",
   "papeis": [
    "cliente"
   ],
   "ids": [
    "ticket_id",
    "cliente_id",
    "profissional_id"
   ],
   "variaveis": [
    {
     "chave": "nome",
     "descricao": "Primeiro nome de quem recebe",
     "exemplo": "Ana"
    },
    {
     "chave": "titulo_original",
     "descricao": "Título que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "texto_original",
     "descricao": "Texto que o sistema escreveu",
     "exemplo": ""
    },
    {
     "chave": "numero_proposta",
     "descricao": "Número da proposta",
     "exemplo": "45"
    }
   ]
  }
 ],
 "condicoes": [
  {
   "chave": "proposta_ainda_nao_assinada",
   "rotulo": "A proposta ainda não foi assinada",
   "descricao": "Só manda se o cliente ainda não assinou a proposta.",
   "eventos": [
    "proposal_created",
    "proposal_updated",
    "invite_accepted"
   ]
  },
  {
   "chave": "contrato_ainda_nao_pago",
   "rotulo": "O contrato assinado ainda não teve pagamento",
   "descricao": "Só manda se nenhum pagamento do contrato foi confirmado ainda (nem o primeiro grupo).",
   "eventos": [
    "proposal_signed"
   ]
  },
  {
   "chave": "fase_ainda_em_conferencia",
   "rotulo": "A fase entregue ainda não foi conferida",
   "descricao": "Só manda se o cliente ainda não aprovou nem recusou a fase entregue.",
   "eventos": [
    "step_delivered"
   ]
  },
  {
   "chave": "reclamacao_ainda_sem_resposta",
   "rotulo": "A reclamação ainda espera resposta",
   "descricao": "Só manda se a reclamação da fase ainda está esperando o profissional ou o cliente responder.",
   "eventos": [
    "step_complaint",
    "step_complaint_answer"
   ]
  },
  {
   "chave": "visita_ainda_nao_confirmada",
   "rotulo": "A visita ainda não foi confirmada",
   "descricao": "Só manda se o cliente ainda não aceitou o horário da visita.",
   "eventos": [
    "visit_proposed",
    "visit_rescheduled"
   ]
  },
  {
   "chave": "conta_de_recebimento_ainda_nao_configurada",
   "rotulo": "A conta de recebimento ainda não está pronta",
   "descricao": "Só manda se o profissional ainda não tem conta bancária que recebe (falta, só PIX, recusada ou parada).",
   "eventos": [
    "payment_blocked_receiving_account",
    "receiving_account_reminder",
    "visit_payment_blocked"
   ]
  },
  {
   "chave": "documento_ainda_pendente",
   "rotulo": "O documento recusado ainda não foi reenviado",
   "descricao": "Só manda se a pessoa ainda não mandou outro documento do mesmo tipo.",
   "eventos": [
    "document_rejected"
   ]
  }
 ]
};

/** POST /admin/notificacoes/previa */
export const PREVIA_REAL = {
  success: true,
  html: "<!doctype html><html><head><style>p{margin:0}</style></head><body><h2>Etapa Entregue! 🚀</h2><p>Olá, Ana</p><p>O prestador entregou a etapa Projeto executivo.</p></body></html>",
  texto: "Etapa Entregue! 🚀\n\nOlá, Ana\n\nO prestador entregou a etapa Projeto executivo.",
  assunto: "Etapa Entregue! 🚀",
  push: { titulo: "Etapa Entregue! 🚀", texto: "O prestador entregou a etapa Projeto executivo. Acesse para revisar e assinar." },
};

/** GET /admin/notificacoes/envios?pagina=1 (linhas cruas de notificacao_envio) */
export const ENVIOS_REAIS = {
  success: true,
  envios: [
    {
      id: 7, titulo: "Manutenção sábado", texto: "O app fica fora do ar das 2h às 4h.", href: null,
      canais: { sino: true, push: true, email: false }, email_modelo: "simples", email_campos: null, publico: { tipo: "todos" },
      agendado_para: "2030-01-10T12:00:00.000Z", status: "agendado", total: 1234, sino_ok: 0, push_ok: 0, email_ok: 0, falhas: 0,
      ultimo_user_id: 0, enviado_em: null, criado_por: "rafael@arqdoor.com", created_at: "2026-11-20T10:00:00.000Z", updated_at: "2026-11-20T10:00:00.000Z",
    },
    {
      id: 6, titulo: "Novidade", texto: "Chegou a carteira.", href: "/financeiro",
      canais: { sino: true, push: true, email: true }, email_modelo: "simples", email_campos: { rodape: "" }, publico: { tipo: "cidade", cidade: "Campinas" },
      agendado_para: null, status: "enviado", total: 40, sino_ok: 40, push_ok: 31, email_ok: 38, falhas: 2,
      ultimo_user_id: 912, enviado_em: "2026-11-19T10:05:00.000Z", criado_por: "rafael@arqdoor.com", createdAt: "2026-11-19T10:00:00.000Z", updatedAt: "2026-11-19T10:05:00.000Z",
    },
  ],
  total: 2, pagina: 1, por_pagina: 20,
};

/** GET /admin/notificacoes/personalizadas (linhas cruas + enviadas_7d/puladas_7d) */
export const PERSONALIZADAS_REAIS = {
  success: true,
  personalizadas_ligadas: true,
  personalizadas: [
    {
      id: 4, nome: "Lembrete de proposta", evento: "proposal_created", atraso_minutos: 2880, condicao: "proposta_ainda_nao_assinada", para: ["cliente"],
      titulo: "Sua proposta está esperando", texto: "A proposta #{numero_proposta} ainda não foi assinada.", href: null,
      canais: { sino: true, push: true, email: false }, email_modelo: "simples", email_campos: null, limite_por_pessoa_dia: 1, ativo: true,
      criado_por: "rafael@arqdoor.com", apagada_em: null, created_at: "2026-11-20T10:00:00.000Z", updated_at: "2026-11-20T10:00:00.000Z",
      enviadas_7d: 12, puladas_7d: 3,
    },
    {
      id: 5, nome: "Fase para conferir", evento: "step_delivered", atraso_minutos: 0, condicao: null, para: ["cliente"],
      titulo: "Confira a fase {fase}", texto: "A fase {fase} está esperando sua conferência.", href: "/projects",
      canais: { sino: true, push: false, email: true }, email_modelo: "simples", email_campos: { saudacao: "" }, limite_por_pessoa_dia: 2, ativo: false,
      criado_por: null, apagada_em: null, createdAt: "2026-11-19T10:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z",
      enviadas_7d: 1, puladas_7d: 0,
    },
  ],
};

/** GET /admin/notificacoes/personalizadas/4/historico */
export const HISTORICO_REAL = {
  success: true,
  agendadas: [
    { id: 31, user_id: 7, papel: "cliente", chave_entidade: "ticket:88", enviar_em: "2026-11-22T10:00:00.000Z", status: "pulada", motivo: "condição não vale mais: A proposta ainda não foi assinada", atualizado_em: "2026-11-22T10:00:01.000Z" },
    { id: 30, user_id: 9, papel: "cliente", chave_entidade: "ticket:87", enviar_em: "2026-11-21T10:00:00.000Z", status: "enviada", motivo: null, atualizado_em: "2026-11-21T10:00:02.000Z" },
  ],
};

/** DELETE /admin/notificacoes/personalizadas/:id com envio na fila */
export const APAGAR_COM_FILA_REAL = {
  success: true, apagada: false, pausada: true, pendentes: 2,
  message: "Tem 2 envio(s) ainda na fila: a notificação foi pausada em vez de apagada. Eles serão pulados.",
};

/** POST /admin/notificacoes/teste { user_id, titulo, ... } e POST /personalizadas/:id/teste */
export const TESTE_COMUNICADO_REAL = { success: true, canais: { sino: true, push: true, email: false }, resultado: { sino: true, push: false, email: false, falhou: false } };
export const TESTE_EVENTO_REAL = { success: true, canais: { sino: true, push: true, email: true } };
export const TESTE_PERSONALIZADA_REAL = { success: true, resultado: { sino: true, push: true, email: false, falhou: true } };

/** PUT /admin/notificacoes/regras/:tipo devolve o item do painel. */
export const eventoSalvo = (tipo: string, regra: Record<string, unknown>) => {
  const e = PAINEL_REAL.eventos.find((x: any) => x.tipo === tipo)!;
  return { success: true, evento: { ...e, regra: { ...e.regra, ...regra }, personalizado: true } };
};
