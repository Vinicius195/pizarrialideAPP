# ✅ Checklist de Testes e Melhorias - PizzaFast Manager

Este documento serve como um roteiro para testar as funcionalidades existentes e guiar a implementação de melhorias no sistema.

---

### 1. Checklist de Testes Funcionais

Roteiro para testar as principais funcionalidades. É recomendado ter dois usuários de teste: um "Administrador" e um "Funcionário".

**🔑 Autenticação e Gestão de Usuários**

- [x] **Login/Logout:**
    - [x] Fazer login como "Administrador".
    - [x] Fazer login como "Funcionário".
    - [x] Fazer logout.
- [x] **Gestão de Papéis (como Administrador):**
    - [x] Acessar a página de "Configurações".
    - [x] Promover um "Funcionário" para "Administrador".
    - [x] Rebaixar um "Administrador" para "Funcionário".
    - [x] Verificar se a opção de alterar o próprio papel não está disponível.
- [x] **Aprovação de Novos Usuários (como Administrador):**
    - [x] Criar um novo usuário pelo formulário de registro (deve ter status "Pendente").
    - [x] Aprovar o cadastro do usuário "Pendente".
    - [x] Reprovar o cadastro de outro usuário "Pendente".
- [x] **Permissões (como Funcionário):**
    - [x] Fazer login como "Funcionário".
    - [x] Acessar "Configurações" e verificar que as opções de promover/rebaixar usuários não estão visíveis.

**🍕 Gestão de Produtos**

- [x] **Criação:**
    - [x] Adicionar um novo produto do tipo "Pizza" com diferentes tamanhos e preços.
    - [x] Adicionar um novo produto do tipo "Bebida".
- [x] **Gerenciamento:**
    - [x] Editar as informações de um produto existente.
    - [x] Marcar um produto como "Indisponível".
    - [x] Verificar se o produto indisponível não aparece ao criar um novo pedido.
    - [x] Marcar o produto como "Disponível" novamente.
    - [x] Excluir um produto.

**📦 Gestão de Pedidos e Entregas**

- [x] **Criação de Pedidos:**
    - [x] Criar um pedido para "Entrega".
    - [x] Criar um pedido para "Retirada".
    - [x] Criar um pedido com pizza "Meio a Meio" e verificar se o preço do mais caro é aplicado.
    - [x] Editar um pedido após a criação.
- [x] **Fluxo Kanban (Página de Entregas):**
    - [x] Avançar um pedido de "Recebido" ➡️ "Preparando" ➡️ "Pronto".
    - [x] Para um pedido de **Entrega**, avançar de "Pronto" ➡️ "Em Entrega" ➡️ "Entregue".
    - [x] Para um pedido de **Retirada**, avançar de "Pronto" ➡️ "Entregue".
    - [x] Cancelar um pedido e verificar se ele sai do fluxo ativo.
- [x] **Dashboard:**
    - [x] Verificar se os contadores de pedidos no Dashboard refletem o status atual no Kanban.

**👥 Gestão de Clientes**

- [x] **Criação:**
    - [x] Adicionar um novo cliente manualmente pela página de "Clientes".
    - [x] Criar um pedido para um cliente que não existe e verificar se ele é salvo automaticamente.
- [x] **Gerenciamento:**
    - [x] Editar os dados de um cliente existente.
    - [x] Verificar se o total gasto e o número de pedidos do cliente são atualizados após um novo pedido.
    - [x] Excluir um cliente e confirmar a ação.

**🔔 Sistema de Notificações**

- [x] **Notificações de Usuário:**
    - [x] **Novo Cadastro:**
        - [x] Criar um novo usuário.
        - [x] Fazer login como **Administrador** e verificar se a notificação "👤 Novo usuário 'Nome' aguardando aprovação." foi recebida.
        - [x] Clicar na notificação e verificar se redireciona para a página de "Configurações".
    - [x] **Atualização de Status:**
        - [x] Aprovar o novo usuário.
        - [x] Fazer login com o novo usuário e verificar se a notificação "🎉 Sua conta foi aprovada! Você já pode acessar o sistema." foi recebida.
- [x] **Notificações de Pedido:**
    - [x] **Novo Pedido:**
        - [x] Criar um novo pedido.
        - [x] Verificar se **Administrador** e **Funcionário** recebem a notificação "🚀 Novo pedido (#XXX) recebido...".
    - [x] **Pedido Editado:**
        - [x] Editar um pedido.
        - [x] Verificar se **Administrador** e **Funcionário** recebem a notificação "✏️ O pedido #XXX foi alterado".
    - [x] **Pedido Pronto:**
        - [x] Avançar um pedido para "Pronto".
        - [x] Verificar se **Administrador** e **Funcionário** recebem a notificação "✅ Pedido #XXX está PRONTO para ENTREGA/RETIRADA!".
    - [x] **Pedido Entregue:**
        - [x] Avançar um pedido para "Entregue".
        - [x] Verificar se **apenas o Administrador** recebe a notificação "🎉 Pedido #XXX foi marcado como ENTREGUE.".
- [x] **Funcionalidade do Sino (Bell):**
    - [x] Verificar se o contador de notificações não lidas é exibido corretamente.
    - [x] Clicar em uma notificação e verificar se ela é marcada como lida e o usuário é redirecionado.
    - [x] Clicar em "Marcar todas como lidas" e verificar se todas as notificações são marcadas como lidas.

---

### 2. Sugestões de Melhoria

Pontos para aprimorar o sistema, organizados por prioridade.

**🚀 Prioridade Alta: Segurança**

- [x] **Falha Crítica de Segurança:** A rota `DELETE /api/users/[id]` não validava se o solicitante é "Administrador".
    - **Ação:** Adicionar a verificação de permissão de Administrador na função `DELETE` do arquivo `src/app/api/users/[id]/route.ts`. **(Implementado)**

**🎨 Prioridade Média: UI/UX e Estilo**

- [x] **Implementar Fontes do Projeto:** Aplicar as fontes `Poppins` e `PT Sans`, definidas no `blueprint.md`, para padronizar o visual. **(Implementado)**
- [x] **Confirmação de Ações:** Adicionar um pop-up de confirmação ("Você tem certeza?") antes de ações destrutivas. **(Implementado para Produtos e Clientes)**
- [x] **Feedback Visual Aprimorado:** Melhorar a resposta visual a ações do usuário, como no Kanban. **(Implementado)**

**💡 Prioridade Baixa: Novas Funcionalidades**

- [x] **Dashboard Inteligente:** Adicionar gráficos de faturamento e ranking de produtos mais vendidos.
- [x] **Histórico de Pedidos do Cliente:** Criar uma tela de detalhes do cliente com seu histórico de pedidos.
- [x] **Relatórios Gerenciais:** Implementar uma seção de "Relatórios" para administradores.
