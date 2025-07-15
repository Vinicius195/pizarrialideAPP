### Checklist para Transformar o App em um PWA

*   [ ] **Passo 1: Instalar Dependências**
    *   Instalar `next-pwa` para gerenciar o Service Worker e o cache.
*   [ ] **Passo 2: Configurar o Next.js**
    *   Modificar o arquivo `next.config.mjs` para integrar o `next-pwa`.
*   [ ] **Passo 3: Criar o `manifest.webmanifest`**
    *   Criar um arquivo `manifest.webmanifest` na pasta `public` para definir o nome, ícones, cores e comportamento de exibição do app.
*   [ ] **Passo 4: Adicionar Metatags e Ícones**
    *   Adicionar as metatags necessárias ao `<head>` no arquivo `src/app/layout.tsx`, incluindo o link para o manifesto e a cor do tema.
*   [ ] **Passo 5: Criar Ícones do Aplicativo**
    *   Gerar e adicionar os ícones necessários para o PWA na pasta `public/icons`.
*   [ ] **Passo 6: Testar e Validar**
    *   Fazer o build de produção e usar o Lighthouse no Chrome DevTools para validar se o app é um PWA instalável.
