# ✅ Checklist - Atualizações em Tempo Real com Firestore

Este checklist guiará a implementação de atualizações em tempo real (real-time) no aplicativo usando os listeners do Cloud Firestore. O objetivo é fazer com que as mudanças feitas por um usuário sejam refletidas instantaneamente na tela de outros usuários, sem a necessidade de recarregar a página.

---

### Planejamento

A estratégia será modificar os hooks de busca de dados existentes (que atualmente usam SWR para fazer fetch em rotas de API) para que eles escutem diretamente as coleções do Firestore usando o método `onSnapshot`. A função `mutate` do SWR será usada para manter o estado local sincronizado.

---

### Checklist de Implementação

- [x] **Passo 1: Modificar Hooks de Dados para Usar Listeners**
    - [x] **Pedidos:**
        - [x] Localizar o hook responsável por buscar a lista de pedidos (provavelmente `useSWR('/api/orders')`).
        - [x] Criar um novo hook, como `useOrdersRealtime`, que estabelece um listener `onSnapshot` na coleção `orders` do Firestore.
        - [x] O hook deve buscar os dados iniciais e, subsequentemente, receber atualizações sempre que um pedido for criado, modificado ou excluído.
    - [x] **Produtos (Opcional, mas recomendado):**
        - [x] Aplicar a mesma lógica para a coleção `products` para que mudanças de preço ou disponibilidade sejam instantâneas.
    - [x] **Clientes (Opcional):**
        - [x] Aplicar a mesma lógica para a coleção `customers` para que novos clientes apareçam em tempo real.

- [x] **Passo 2: Integrar Listeners com a Gestão de Estado (SWR)**
    - [x] Dentro do listener `onSnapshot`, após receber os dados atualizados do Firestore, chamar a função `mutate` do SWR.
    - [x] A chamada a `mutate` deve passar a nova lista de dados (ex: `mutate('/api/orders', newOrdersList, false)`). O `false` no final evita uma revalidação automática, pois já temos os dados mais recentes do listener.
    - [x] Garantir que a inscrição no listener (`onSnapshot`) seja cancelada quando o componente que usa o hook for desmontado. Isso é crucial para evitar memory leaks.

- [x] **Passo 3: Substituir o Uso dos Hooks Antigos**
    - [x] Nos componentes onde os dados são exibidos (ex: página de Pedidos, Entregas, Produtos), substituir a chamada ao antigo hook de fetch pelo novo hook de tempo real (ex: trocar `useSWR('/api/orders')` por `useOrdersRealtime()`).

- [x] **Passo 4: Teste de Ponta a Ponta**
    - [x] Abrir a aplicação em duas janelas ou dispositivos diferentes, logado com usuários diferentes (ex: "Administrador" e "Funcionário").
    - [x] **Teste de Pedidos:**
        - [x] Em uma janela, criar um novo pedido.
        - [x] **Verificar:** O novo pedido deve aparecer instantaneamente na lista de pedidos e no Kanban da outra janela.
        - [x] Em uma janela, mover um pedido de "Recebido" para "Preparando".
        - [x] **Verificar:** O card do pedido deve mover-se de coluna em tempo real na outra janela.
    - [x] **Teste de Produtos:**
        - [x] Em uma janela, editar o preço de um produto.
        - [x] **Verificar:** Ao tentar criar um pedido na outra janela, o novo preço já deve estar visível.
