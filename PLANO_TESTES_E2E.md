# HomeTrace - Plano de Testes E2E (End-to-End)

## Visao Geral do Produto

**HomeTrace** e uma plataforma de busca imobiliaria com IA que conecta compradores (Buyers) e corretores (Realtors). O sistema permite:
- Gravacao de audio durante visitas a imoveis
- Perfil de "casa dos sonhos" construido via chat com IA
- Match scoring entre imoveis e preferencias
- Relatorios de IA comparando propriedades visitadas
- Gestao de tours otimizados para corretores

---

## 1. JORNADA DO BUYER - Fluxo Completo

### 1.1 Registro e Onboarding

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| B1.1 | Registro de novo Buyer | 1. Acessar /sign-up/buyer<br>2. Preencher nome, email, senha<br>3. Submeter formulario | Conta criada, redirecionado para /client |
| B1.2 | Login com credenciais validas | 1. Acessar /sign-in<br>2. Inserir email e senha<br>3. Clicar em Login | Redirecionado para dashboard /client |
| B1.3 | Login com credenciais invalidas | 1. Acessar /sign-in<br>2. Inserir email/senha incorretos | Mensagem de erro, permanece na pagina |
| B1.4 | Logout | 1. Estando logado, clicar em Logout | Sessao encerrada, redirecionado para /sign-in |
| B1.5 | Recuperacao de senha | 1. Clicar "Esqueci senha"<br>2. Inserir email<br>3. Verificar email recebido | Email com link de reset enviado |

### 1.2 Dream House Profile (Perfil Casa dos Sonhos)

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| B2.1 | Iniciar chat de perfil | 1. Acessar /client/dream-house<br>2. Iniciar conversa | IA faz primeira pergunta sobre preferencias |
| B2.2 | Responder perguntas da IA | 1. Responder sobre localizacao<br>2. Responder sobre orcamento<br>3. Responder sobre tamanho<br>4. Responder sobre features | IA processa e faz follow-ups |
| B2.3 | Completar perfil | 1. Responder todas as perguntas<br>2. IA extrai perfil estruturado | Perfil marcado como completo, JSON de preferencias salvo |
| B2.4 | Resetar perfil | 1. Clicar em resetar/recomecar | Historico de chat limpo, pode comecar de novo |

### 1.3 Gestao de Imoveis

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| B3.1 | Listar imoveis | 1. Acessar /client/houses | Lista de imoveis com cards (foto, preco, endereco) |
| B3.2 | Buscar imovel por endereco | 1. Usar campo de busca<br>2. Inserir endereco ou cidade | Resultados filtrados aparecem |
| B3.3 | Ver detalhes do imovel | 1. Clicar em um card de imovel | Pagina de detalhes com fotos, specs, descricao |
| B3.4 | Marcar como favorito | 1. Na lista ou detalhe, clicar no icone de favorito | Imovel marcado, aparece na lista de favoritos |
| B3.5 | Ver match score | 1. Ter perfil completo<br>2. Ver card do imovel | Score de 0-100 exibido com breakdown |
| B3.6 | Adicionar imovel manualmente | 1. Clicar "Adicionar"<br>2. Preencher endereco e detalhes | Imovel criado na lista |

### 1.4 Agendamento e Execucao de Visitas

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| B4.1 | Agendar visita | 1. Na pagina do imovel, clicar "Agendar Visita"<br>2. Selecionar data e hora<br>3. Confirmar | Visita criada com status SCHEDULED |
| B4.2 | Ver calendario de visitas | 1. Acessar /client/calendar | Todas as visitas exibidas no calendario |
| B4.3 | Iniciar visita | 1. No dia da visita, clicar "Iniciar Visita" | Status muda para IN_PROGRESS |
| B4.4 | Gravar audio em comodo | 1. Durante visita, selecionar comodo (ex: "Cozinha")<br>2. Clicar em gravar<br>3. Falar impressoes<br>4. Parar gravacao | Audio salvo, associado ao comodo |
| B4.5 | Gravar multiplos comodos | 1. Gravar na sala<br>2. Gravar no quarto<br>3. Gravar na cozinha | 3+ gravacoes associadas a visita |
| B4.6 | Finalizar visita | 1. Clicar "Finalizar Visita"<br>2. Selecionar impressao geral (Amei/Gostei/Neutro/Nao gostei)<br>3. Confirmar | Status muda para COMPLETED |
| B4.7 | Cancelar visita | 1. Na visita agendada, clicar "Cancelar" | Status muda para CANCELLED |

### 1.5 Gravacoes e Analise

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| B5.1 | Ouvir gravacao | 1. Acessar visita completada<br>2. Clicar em uma gravacao | Player de audio funciona |
| B5.2 | Ver transcricao | 1. Acessar gravacao analisada | Texto transcrito exibido |
| B5.3 | Ver analise de sentimento | 1. Acessar gravacao analisada | Sentimento (positivo/negativo/neutro) exibido |
| B5.4 | Ver pontos-chave | 1. Acessar gravacao analisada | Lista de key points extraidos pela IA |

### 1.6 Relatorios de IA

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| B6.1 | Gerar relatorio | 1. Ter 2+ visitas completadas<br>2. Acessar /client/reports<br>3. Clicar "Gerar Relatorio" | Relatorio criado com status GENERATING -> COMPLETED |
| B6.2 | Ver ranking de imoveis | 1. Abrir relatorio gerado | Lista de imoveis ordenada por score |
| B6.3 | Ver recomendacao top | 1. Abrir relatorio | Imovel recomendado destacado com justificativa |
| B6.4 | Ver pros/contras por imovel | 1. Expandir imovel no relatorio | Lista de pros e contras |
| B6.5 | Ver insights estrategicos | 1. Ver secao de insights | 5+ insights por categoria |
| B6.6 | Ver proximos passos | 1. Ver secao de next steps | 3-5 acoes recomendadas |

### 1.7 Comparacao de Imoveis

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| B7.1 | Selecionar imoveis para comparar | 1. Marcar 2-3 imoveis<br>2. Clicar "Comparar" | Tela de comparacao lado a lado |
| B7.2 | Ver comparativo visual | 1. Na tela de comparacao | Precos, specs, pros/contras lado a lado |
| B7.3 | Ouvir gravacoes na comparacao | 1. Clicar play em gravacao de cada imovel | Pode ouvir impressoes de cada um |

### 1.8 Configuracoes e Privacidade

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| B8.1 | Alterar dados do perfil | 1. Acessar /client/settings<br>2. Editar nome/telefone<br>3. Salvar | Dados atualizados |
| B8.2 | Alterar senha | 1. Em settings, ir para "Alterar Senha"<br>2. Inserir senha atual e nova<br>3. Confirmar | Senha alterada com sucesso |
| B8.3 | Configurar privacidade | 1. Acessar configuracoes de privacidade<br>2. Toggle compartilhar perfil com realtor<br>3. Toggle compartilhar gravacoes | Preferencias salvas |

---

## 2. JORNADA DO REALTOR

### 2.1 Registro e Onboarding

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| R1.1 | Registro de novo Realtor | 1. Acessar /sign-up/realtor<br>2. Preencher dados<br>3. Submeter | Conta criada, redirecionado para /realtor |
| R1.2 | Login como Realtor | 1. Acessar /sign-in<br>2. Inserir credenciais | Redirecionado para dashboard /realtor |

### 2.2 Gestao de Convites

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| R2.1 | Enviar convite para buyer | 1. Acessar /realtor/invite<br>2. Inserir email do buyer<br>3. Definir expiracao (7 dias)<br>4. Enviar | Convite criado, email enviado |
| R2.2 | Ver status dos convites | 1. Acessar lista de convites | Status PENDING/ACCEPTED/EXPIRED visivel |
| R2.3 | Reenviar convite expirado | 1. Em convite expirado, clicar "Reenviar" | Novo convite criado |
| R2.4 | Buyer aceita convite | 1. Buyer clica no link<br>2. Cria conta ou faz login<br>3. Aceita convite | Conexao buyer-realtor criada |

### 2.3 Gestao de Clientes

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| R3.1 | Listar clientes conectados | 1. Acessar /realtor/clients | Lista de buyers conectados |
| R3.2 | Ver detalhes do cliente | 1. Clicar em um cliente | Ver info, visitas, atividade |
| R3.3 | Ver atividade do cliente | 1. No detalhe do cliente | Ver imoveis visitados, gravacoes (se permitido) |
| R3.4 | Encerrar conexao | 1. Clicar "Remover Cliente"<br>2. Confirmar | Conexao soft-deleted |

### 2.4 Gestao de Imoveis

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| R4.1 | Adicionar imovel para cliente | 1. Acessar /realtor/houses<br>2. Buscar imovel na Realty API<br>3. Adicionar para cliente especifico | Imovel aparece na lista do buyer |
| R4.2 | Adicionar imovel manualmente | 1. Clicar "Adicionar Manual"<br>2. Preencher endereco e dados | Imovel criado |
| R4.3 | Ver todos os imoveis | 1. Acessar /realtor/houses | Lista de todos imoveis gerenciados |

### 2.5 Criacao e Gestao de Tours

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| R5.1 | Criar novo tour | 1. Acessar /realtor/tours<br>2. Clicar "Novo Tour"<br>3. Dar nome e selecionar cliente | Tour criado com status PLANNED |
| R5.2 | Adicionar paradas ao tour | 1. No tour, clicar "Adicionar Parada"<br>2. Selecionar imovel<br>3. Repetir para 3-5 imoveis | Paradas adicionadas em ordem |
| R5.3 | Reordenar paradas | 1. Arrastar paradas para nova ordem | Ordem atualizada |
| R5.4 | Otimizar rota | 1. Clicar "Otimizar Rota" | Sistema sugere melhor ordem baseado em distancia |
| R5.5 | Agendar tour | 1. Definir data e hora<br>2. Salvar | Tour agendado |
| R5.6 | Cancelar tour | 1. Clicar "Cancelar Tour" | Status muda para CANCELLED |

### 2.6 Calendario e Agenda

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| R6.1 | Ver calendario de visitas | 1. Acessar /realtor/schedule | Todas visitas de todos clientes no calendario |
| R6.2 | Filtrar por cliente | 1. Selecionar cliente no filtro | Apenas visitas do cliente selecionado |
| R6.3 | Ver detalhes da visita | 1. Clicar em evento no calendario | Modal com detalhes da visita |

### 2.7 Rota do Dia

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| R7.1 | Ver rota otimizada | 1. Acessar /realtor/route<br>2. Selecionar tour | Mapa com rota entre imoveis |
| R7.2 | Ver tempo estimado | 1. Na rota | Tempo de viagem entre paradas |

---

## 3. JORNADA DO ADMIN

### 3.1 Acesso e Dashboard

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| A1.1 | Login como Admin | 1. Fazer login com conta ADMIN | Redirecionado para /admin |
| A1.2 | Ver estatisticas do sistema | 1. Acessar /admin | Dashboard com metricas gerais |

### 3.2 Gestao de Usuarios

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| A2.1 | Listar todos usuarios | 1. Acessar /admin/users | Lista paginada de usuarios |
| A2.2 | Filtrar por role | 1. Selecionar filtro BUYER/REALTOR | Lista filtrada |
| A2.3 | Buscar usuario | 1. Digitar nome ou email | Resultados da busca |
| A2.4 | Ver detalhes do usuario | 1. Clicar em usuario | Info detalhada, atividade, metricas |

### 3.3 Gestao de Imoveis

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| A3.1 | Listar todos imoveis | 1. Acessar /admin/houses | Lista de todos imoveis do sistema |
| A3.2 | Ver status de sincronizacao | 1. Verificar lastSyncedAt | Data da ultima sincronizacao com Realty API |

### 3.4 Configuracao do Sistema

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| A4.1 | Configurar chaves de API | 1. Acessar /admin/config<br>2. Inserir RAPIDAPI_KEY<br>3. Inserir ANTHROPIC_API_KEY<br>4. Salvar | Chaves salvas |
| A4.2 | Testar conectividade | 1. Clicar "Testar" em cada servico | Status verde = OK, vermelho = erro |
| A4.3 | Ver status dos servicos | 1. Acessar /admin/config | Status de cada integracao |

### 3.5 Logs e Monitoramento

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| A5.1 | Ver logs de API | 1. Acessar /admin/logs | Lista de chamadas de API com status |
| A5.2 | Filtrar logs por servico | 1. Selecionar servico (anthropic, realty_api, etc) | Logs filtrados |
| A5.3 | Ver erros | 1. Filtrar por status de erro | Chamadas que falharam |

---

## 4. FLUXOS DE INTEGRACAO

### 4.1 Fluxo Buyer + Realtor

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| I1.1 | Realtor convida Buyer | 1. Realtor envia convite<br>2. Buyer recebe email<br>3. Buyer aceita e cria conta | Conexao estabelecida |
| I1.2 | Realtor adiciona imovel para Buyer | 1. Realtor adiciona imovel<br>2. Buyer ve imovel na sua lista | Imovel compartilhado |
| I1.3 | Realtor cria tour para Buyer | 1. Realtor cria tour com 3 imoveis<br>2. Buyer ve tour agendado | Tour visivel para ambos |
| I1.4 | Buyer executa tour | 1. Buyer inicia visita 1<br>2. Grava, finaliza<br>3. Repete para visitas 2 e 3 | Todas visitas completadas |
| I1.5 | Realtor acompanha progresso | 1. Realtor ve status das visitas | Status IN_PROGRESS e COMPLETED visiveis |

### 4.2 Fluxo Completo de IA

| # | Cenario | Passos | Resultado Esperado |
|---|---------|--------|-------------------|
| I2.1 | Perfil + Match Score | 1. Buyer completa dream profile<br>2. Adiciona imovel<br>3. Ve match score | Score calculado baseado no perfil |
| I2.2 | Gravacao + Transcricao | 1. Buyer grava audio<br>2. Sistema transcreve<br>3. Sistema analisa sentimento | Transcricao e sentimento disponiveis |
| I2.3 | Relatorio Completo | 1. Buyer tem perfil completo<br>2. Buyer visitou 3+ imoveis<br>3. Gera relatorio | Relatorio com ranking, insights, recomendacoes |

---

## 5. CENARIOS DE ERRO E EDGE CASES

### 5.1 Autenticacao

| # | Cenario | Resultado Esperado |
|---|---------|-------------------|
| E1.1 | Token expirado | Auto-refresh ou redirect para login |
| E1.2 | Inatividade 30min | Logout automatico |
| E1.3 | Acesso a rota nao autorizada (buyer em /admin) | Redirect para pagina correta |
| E1.4 | Sessao revogada em outro dispositivo | Logout forcado |

### 5.2 Validacoes de Formulario

| # | Cenario | Resultado Esperado |
|---|---------|-------------------|
| E2.1 | Email invalido no registro | Mensagem de erro, nao submete |
| E2.2 | Senha fraca | Mensagem indicando requisitos |
| E2.3 | Campos obrigatorios vazios | Validacao client-side |
| E2.4 | Email ja cadastrado | Mensagem "email ja existe" |

### 5.3 Upload de Audio

| # | Cenario | Resultado Esperado |
|---|---------|-------------------|
| E3.1 | Audio > 50MB | Erro "arquivo muito grande" |
| E3.2 | Formato nao suportado | Erro "formato invalido" |
| E3.3 | Falha no upload | Retry automatico ou mensagem |

### 5.4 Servicos Externos

| # | Cenario | Resultado Esperado |
|---|---------|-------------------|
| E4.1 | Realty API indisponivel | Mensagem de erro, fallback para dados locais |
| E4.2 | Anthropic API indisponivel | Mensagem "servico indisponivel", funcoes basicas continuam |
| E4.3 | Transcricao falha | Status FAILED, opcao de retry |

---

## 6. TESTES DE RESPONSIVIDADE

| # | Cenario | Dispositivos |
|---|---------|-------------|
| RS1 | Dashboard Buyer | Desktop, Tablet, Mobile |
| RS2 | Lista de Imoveis | Desktop, Tablet, Mobile |
| RS3 | Tela de Gravacao | Mobile (principal caso de uso) |
| RS4 | Calendario | Desktop, Tablet |
| RS5 | Comparacao de Imoveis | Desktop, Tablet |

---

## 7. ORDEM DE PRIORIDADE PARA TESTES

### Prioridade 1 - Criticos (Bloqueia uso)
1. B1.1 - Registro de Buyer
2. B1.2 - Login
3. B4.1 - Agendar visita
4. B4.3 - Iniciar visita
5. B4.4 - Gravar audio
6. B4.6 - Finalizar visita
7. R2.1 - Enviar convite
8. R2.4 - Buyer aceita convite

### Prioridade 2 - Importantes (Core features)
1. B2.1-B2.3 - Dream House Profile completo
2. B3.5 - Match Score
3. B6.1-B6.6 - Relatorios de IA
4. R5.1-R5.5 - Gestao de Tours
5. I1.1-I1.5 - Fluxo Buyer+Realtor

### Prioridade 3 - Secundarios (Nice to have)
1. B7.1-B7.3 - Comparacao
2. B8.1-B8.3 - Configuracoes
3. A4.1-A4.3 - Config Admin
4. RS1-RS5 - Responsividade

---

## 8. AMBIENTE DE TESTES

### Pre-requisitos
- [ ] Banco PostgreSQL rodando (docker-compose up)
- [ ] Migrations aplicadas (npx prisma migrate dev)
- [ ] Seed data populado (npx prisma db seed)
- [ ] Variaveis de ambiente configuradas (.env)
- [ ] Servidor rodando (npm run dev)

### Dados de Teste Sugeridos
- 1 usuario ADMIN
- 2 usuarios REALTOR
- 3 usuarios BUYER
- 5-10 imoveis de teste
- 2-3 visitas completadas com gravacoes

### URLs de Teste
- Local: http://localhost:3000
- Sign In: /sign-in
- Sign Up Buyer: /sign-up/buyer
- Sign Up Realtor: /sign-up/realtor
- Dashboard Buyer: /client
- Dashboard Realtor: /realtor
- Admin: /admin

---

## Changelog

| Data | Versao | Descricao |
|------|--------|-----------|
| 2025-01-07 | 1.0 | Versao inicial do plano de testes |
