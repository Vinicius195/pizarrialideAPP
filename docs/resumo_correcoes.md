# ✅ Resumo das Correções para Reaplicação Manual

Este arquivo documenta as soluções para os problemas que resolvemos, para que possam ser reaplicadas de forma segura.

---

### 1. Gestão de Contas de Usuário (Aprovação/Promoção)

*   **Problema:** Administradores não conseguiam aprovar, reprovar, promover ou rebaixar contas. A interface mostrava sucesso, mas o banco de dados não era alterado.
*   **Arquivo a ser modificado:** `src/app/api/users/[id]/route.ts`
*   **Solução:** Substituir a função `PUT` existente pela versão abaixo. Esta versão garante que a permissão de administrador seja verificada primeiro e depois aplica a atualização (`status` ou `role`) de forma segura, usando uma transação para evitar erros.

```typescript
// (Dentro de src/app/api/users/[id]/route.ts)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const requestingUid = await getRequestingUserId(request);
    if (!requestingUid) {
        return new NextResponse('Unauthorized: Invalid or missing token.', { status: 401 });
    }

    const requesterDoc = await db.collection('users').doc(requestingUid).get();
    const requesterProfile = requesterDoc.data();
    if (!requesterProfile || requesterProfile.role !== 'Administrador') {
        return new NextResponse('Forbidden: You do not have permission to perform this action.', { status: 403 });
    }

    const userIdToUpdate = params.id;
    if (requestingUid === userIdToUpdate) {
        return new NextResponse('Forbidden: Administrators cannot change their own role or status.', { status: 403 });
    }

    const dataToUpdate: Partial<UserProfile> = await request.json();
    
    await db.runTransaction(async (transaction) => {
        const userDocRef = db.collection('users').doc(userIdToUpdate);
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists) {
            throw new Error("User document not found!");
        }
        const newProfileData = { ...userDoc.data(), ...dataToUpdate };
        transaction.update(userDocRef, newProfileData);
    });

    if (dataToUpdate.status) {
        await notifyUserOfStatusChange(userIdToUpdate, dataToUpdate.status);
    }
    if (dataToUpdate.name) {
      await admin.auth().updateUser(userIdToUpdate, { displayName: dataToUpdate.name });
    }

    return NextResponse.json({ message: 'User profile updated successfully' });

  } catch (error) {
    console.error(`Error updating user profile ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

---

### 2. Notificações Push (Erro do Service Worker)

*   **Problema:** O aplicativo não conseguia registrar o Service Worker, impedindo as notificações push.
*   **Solução (em 3 passos):**
    1.  **Criar uma Rota Dinâmica:** Crie o arquivo `src/app/firebase-config.js/route.ts` com o seguinte conteúdo para gerar a configuração do Firebase dinamicamente:
        ```typescript
        import { NextResponse } from 'next/server';

        export async function GET() {
          const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          };

          const scriptContent = `self.firebaseConfig = ${JSON.stringify(firebaseConfig)};`;

          return new NextResponse(scriptContent, {
            headers: { 'Content-Type': 'application/javascript' },
          });
        }
        ```
    2.  **Atualizar o Service Worker:** Modifique o arquivo `public/firebase-messaging-sw.js` para que ele importe a configuração da nova rota dinâmica:
        ```javascript
        importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
        importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
        
        // Importa a configuração da rota dinâmica
        importScripts('/firebase-config.js');

        if (self.firebaseConfig) {
          firebase.initializeApp(self.firebaseConfig);
          const messaging = firebase.messaging();

          messaging.onBackgroundMessage((payload) => {
            // ... (resto da lógica de notificação) ...
          });
        }
        ```
    3.  **Remover Arquivo Incorreto:** Se você criou um arquivo estático `public/firebase-config.js`, delete-o.

---

### 3. Links de Entrega (Abrir no App de Mapa)

*   **Problema:** Links de localização abriam no navegador em vez do app de mapas nativo no celular.
*   **Arquivo a ser modificado:** `src/components/app/order-details-dialog.tsx`
*   **Solução:** Adicionar o componente `SmartMapLink` e usá-lo para renderizar o link. Ele detecta o sistema operacional e gera a URL correta.

```tsx
// (Adicionar este componente dentro de src/components/app/order-details-dialog.tsx)
const SmartMapLink = ({ gmapsUrl, address }: { gmapsUrl?: string, address?: string }) => {
    const [mapHref, setMapHref] = useState(gmapsUrl || '#');

    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.userAgent) {
            const userAgent = navigator.userAgent.toLowerCase();
            const isIOS = /iphone|ipad|ipod/.test(userAgent);
            const isAndroid = /android/.test(userAgent);

            if (gmapsUrl) {
                setMapHref(gmapsUrl); 
            } else if (address) {
                const encodedAddress = encodeURIComponent(address);
                if (isIOS) {
                    setMapHref(`maps://?q=${encodedAddress}`);
                } else if (isAndroid) {
                    setMapHref(`geo:0,0?q=${encodedAddress}`);
                } else {
                    setMapHref(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
                }
            }
        }
    }, [gmapsUrl, address]);

    return (
        <Button asChild variant="link" className="h-auto p-0 text-sm">
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Abrir no mapa
            </a>
        </Button>
    );
};

// (Dentro do return do OrderDetailsDialog, substituir o botão de link original por este)
<div className="pl-6">
    <SmartMapLink gmapsUrl={order.locationLink} address={order.address} />
</div>
```

---

### 4. Layout do Dashboard em Celulares

*   **Problema:** Os cards no Dashboard ficavam "miniaturizados" em telas de celular.
*   **Arquivo a ser modificado:** `src/app/(app)/dashboard/page.tsx`
*   **Solução:** Adicionar classes responsivas para ajustar o tamanho da fonte, o espaçamento e o layout da grade em telas pequenas.

1.  **Ajustar a Grade de Cards de Status:**
    *   **De:** `grid gap-4 md:grid-cols-2 lg:grid-cols-3`
    *   **Para:** `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4`

2.  **Ajustar o Conteúdo dos Cards:** Adicionar classes responsivas para o espaçamento (`p-4 sm:pb-2`) e tamanho da fonte (`text-2xl sm:text-3xl`).

    ```tsx
    // Exemplo de um card corrigido
    <Card className="shadow-md hover:shadow-lg transition-shadow h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", color)} />
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:pt-2">
        <div className="text-2xl sm:text-3xl font-bold">{getOrderCountByStatus(status)}</div>
        <p className="text-xs text-muted-foreground">Total de pedidos neste status</p>
      </CardContent>
    </Card>
    ```
3.  **Ajustar a Tabela:** Envolver a `<Table>` em uma `<div>` com `overflow-x-auto` para permitir a rolagem horizontal em telas pequenas.

    ```tsx
    <CardContent className="p-0">
        <div className="overflow-x-auto">
            <Table>
                {/* ... conteúdo da tabela ... */}
            </Table>
        </div>
    </CardContent>
    ```

---
