# Checklist de Funcionalidades para Testes

Este documento detalha todas as funcionalidades do sistema para garantir uma cobertura de testes completa, desde a interface do usuário até as operações de back-end.

---

## Módulo: Dashboard (`/dashboard`)

- [x] **Carregamento Inicial:** Verificar se todos os cards de status dos pedidos são carregados corretamente.
- [x] **Cards de Contagem por Status:**
    - [x] Verificar se o card "Pedidos Recebidos" exibe a contagem correta.
    - [x] Verificar se o card "Em Preparo" exibe a contagem correta.
    - [x] Verificar se o card "Pedidos Prontos" exibe a contagem correta.
    - [x] Verificar se o card "Em Rota de Entrega" exibe a contagem correta.
    - [x] Verificar se o card "Pedidos Entregues" exibe a contagem correta.
    - [x] Verificar se o card "Pedidos Cancelados" exibe a contagem correta.
- [x] **Atualização em Tempo Real:**
    - [x] Alterar o status de um pedido em outra página (ex: Kanban de Entregas).
    - [x] Voltar ao dashboard e verificar se a contagem nos cards foi atualizada automaticamente.
- [x] **Verificação do Total de Pedidos:**
    - [x] Confirmar se a soma dos pedidos (exceto "Cancelado") corresponde ao esperado.

## Módulo: Clientes (`/clientes`)

- [x] **Listagem de Clientes:**
    - [x] Visualizar a tabela com todos os clientes cadastrados.
    - [x] Verificar se a busca na tabela funciona corretamente.
- [x] **Adicionar Cliente:**
    - [x] Abrir o diálogo "Adicionar Cliente".
    - [x] Preencher e enviar o formulário com dados válidos e verificar se o cliente aparece na lista.
    - [x] Tentar enviar o formulário com dados inválidos e verificar se as mensagens de erro são exibidas.
- [x] **Editar Cliente:**
    - [x] Abrir o diálogo de edição a partir da lista de clientes.
    - [x] Modificar os dados, salvar e verificar se as informações foram atualizadas na tabela.
- [x] **Excluir Cliente:**
    - [x] Clicar no botão para excluir um cliente.
    - [x] Confirmar a exclusão na caixa de diálogo de alerta.
    - [x] Verificar se o cliente foi removido da lista.
- [x] **Histórico do Cliente:**
    - [x] Clicar em um cliente para navegar até a página de detalhes (`/clientes/[id]`).
    - [x] Verificar se o histórico de pedidos do cliente é exibido corretamente.

## Módulo: Produtos (`/produtos`)

- [x] **Listagem de Produtos:**
    - [x] Visualizar a tabela com todos os produtos.
- [x] **Adicionar Produto:**
    - [x] Abrir o diálogo "Adicionar Produto".
    - [x] Preencher o formulário com dados válidos (nome, preço, etc.).
    - [x] Salvar e verificar se o novo produto aparece na lista.
- [x] **Editar Produto:**
    - [x] Abrir o diálogo de edição de um produto.
    - [x] Alterar os dados e salvar.
    - [x] Verificar se as informações do produto foram atualizadas.
- [x] **Excluir Produto:**
    - [x] Clicar no botão para excluir um produto.
    - [x] Confirmar a exclusão e verificar se o produto foi removido da lista.

## Módulo: Pedidos (`/pedidos`)

- [ ] **Listagem de Pedidos:**
    - [x] Visualizar a lista de todos os pedidos com seus respectivos status.
- [ ] **Adicionar Pedido:**
    - [x] Abrir o diálogo "Novo Pedido".
    - [x] Selecionar um cliente da lista.
    - [ ] Adicionar um ou mais produtos ao pedido.
    - [ ] Definir as quantidades e verificar se o cálculo do valor total está correto.
    - [ ] Salvar o pedido e confirmar seu aparecimento na lista com o status "Pendente".
- [ ] **Detalhes do Pedido:**
    - [ ] Abrir o diálogo "Detalhes do Pedido".
    - [ ] Verificar se todos os dados (cliente, produtos, quantidades, total, status) estão corretos.
- [ ] **Cancelar Pedido:**
    - [ ] Clicar na opção para cancelar um pedido.
    - [ ] Confirmar a ação e verificar se o status do pedido muda para "Cancelado".
- [ ] **Excluir Todos os Pedidos:**
    - [ ] Clicar no botão "Excluir Todos" (se disponível para o usuário).
    - [ ] Confirmar a ação e verificar se a lista de pedidos fica vazia.

## Módulo: Entregas (`/entregas`) - Kanban

- [ ] **Visualização do Kanban:**
    - [ ] Verificar se o quadro é exibido com as colunas de status ("Pendente", "Em Preparo", "Saiu para Entrega", "Concluído").
    - [ ] Checar se os pedidos estão alocados nas colunas corretas.
- [ ] **Avançar Status do Pedido:**
    - [ ] Clicar no botão para avançar o status de um pedido (ex: de "Pendente" para "Em Preparo").
    - [ ] Verificar se o card do pedido se move para a coluna seguinte.
    - [ ] Avançar um pedido até o status "Concluído".

## Módulo: Configurações (`/configuracoes`)

- [ ] **Gerenciamento de Usuários:**
    - [ ] Visualizar a lista de usuários do sistema.
    - [ ] Editar a função de um usuário (ex: de "Membro" para "Administrador").
    - [ ] Salvar e verificar se a alteração foi aplicada.
- [ ] **Excluir Usuário:**
    - [ ] Clicar para excluir um usuário.
    - [ ] Confirmar e verificar se o usuário foi removido da lista.
- [ ] **Tema da Aplicação:**
    - [ ] Alternar entre o tema Claro (Light) e Escuro (Dark).
    - [ ] Verificar se a alteração é aplicada em toda a interface.

## Módulo: Notificações (Push Notifications)

- [ ] **Permissão:**
    - [ ] No primeiro acesso (ou após limpar permissões), verificar se o navegador solicita permissão para enviar notificações.
- [ ] **Recebimento em Primeiro Plano:**
    - [ ] Manter o aplicativo aberto e executar uma ação que dispare uma notificação (ex: um novo pedido é criado por outro usuário).
    - [ ] Verificar se um toast/alerta de notificação aparece na tela.
    - [ ] Verificar se o ícone de sino (NotificationBell) indica uma nova notificação.
- [ ] **Recebimento em Segundo Plano:**
    - [ ] Deixar o aplicativo em uma aba inativa ou minimizado.
    - [ ] Disparar uma notificação e verificar se a notificação do sistema operacional é exibida.

## Módulo: Autenticação e Permissões

- [ ] **Registro e Login:**
    - [ ] Acessar a página de registro (`/registrar`) e criar uma nova conta.
    - [ ] Realizar login com um usuário válido.
    - [ ] Tentar realizar login com credenciais inválidas e verificar a mensagem de erro.
    - [ ] Realizar logout e ser redirecionado para a página de login.
- [ ] **Controle de Acesso (RBAC):**
    - [ ] Fazer login como um usuário com função "Membro".
    - [ ] Tentar acessar uma área restrita a administradores (ex: `/configuracoes`).
    - [ ] Tentar executar uma ação de administrador (ex: excluir um usuário) e verificar se a ação é bloqueada.
- [ ] **Sessão de Usuário:**
    - [ ] Após o login, verificar se as informações do usuário são carregadas no contexto da aplicação.
    - [ ] Atualizar a página e verificar se a sessão do usuário permanece ativa.

---