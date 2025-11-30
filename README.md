# Biofouling Frontend

Frontend para o sistema de predição de biofouling em navios da Petrobras.

## Estrutura do Projeto

```
biofouling-frontend/
├── index.html              # Dashboard principal
├── navios.html             # Página de navios e predições
├── script.js               # Scripts principais (gráficos, interatividade)
├── styles.css              # Estilos globais
├── config.js               # Configuração da API
├── api.js                  # Módulo de integração com API
├── components.js           # Componentes reutilizáveis de UI
├── navios-integration.js    # Integração específica da página navios
├── dashboard-integration.js # Integração específica do dashboard
├── vercel.json             # Configuração do deploy Vercel
└── docs/
    └── context.md          # Documentação da API
```

## Funcionalidades

### Dashboard (`index.html`)
- Visualização de métricas principais (navios ativos, velocidade média, economia, emissões)
- Gráfico de manutenções mensais
- Lista de status dos navios
- Atualização dinâmica com dados da API

### Página de Navios (`navios.html`)
- Formulário para fazer predições de biofouling
- Exibição de resultados com análise de impacto completa
- Visualização de navios agrupados por nível de risco
- Integração completa com API de predição

## Integração com API

A aplicação se conecta automaticamente à API de produção:
- **Produção**: `https://biofouling-api-454735405258.us-central1.run.app`
- **Desenvolvimento**: `http://localhost:8000` (quando rodando localmente)

A detecção do ambiente é automática baseada no hostname.

### Endpoints Utilizados

- `GET /health` - Verificação de saúde da API
- `POST /api/v1/predict/with-impact` - Predição com análise de impacto (recomendado)
- `POST /api/v1/predict` - Predição simples
- `POST /api/v1/predict/batch` - Predição em lote

## Deploy na Vercel

### Pré-requisitos

1. Conta na [Vercel](https://vercel.com)
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. Projeto já commitado no repositório

### Passos para Deploy

1. **Instalar Vercel CLI** (opcional, pode usar interface web):
   ```bash
   npm i -g vercel
   ```

2. **Fazer login na Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy do projeto**:
   ```bash
   vercel
   ```
   
   Ou use a interface web:
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "Add New Project"
   - Importe seu repositório
   - Configure o projeto (as configurações do `vercel.json` serão aplicadas automaticamente)

4. **Deploy de produção**:
   ```bash
   vercel --prod
   ```

### Configuração Automática

O arquivo `vercel.json` já está configurado com:
- Rotas para as páginas HTML
- Headers de segurança
- Build estático

### Variáveis de Ambiente

Não são necessárias variáveis de ambiente, pois a URL da API é detectada automaticamente.

## Desenvolvimento Local

1. **Servir os arquivos estáticos**:
   
   Usando Python:
   ```bash
   python -m http.server 8000
   ```
   
   Usando Node.js (http-server):
   ```bash
   npx http-server -p 8000
   ```
   
   Usando PHP:
   ```bash
   php -S localhost:8000
   ```

2. **Acessar a aplicação**:
   - Abra `http://localhost:8000` no navegador
   - A aplicação detectará automaticamente que está em desenvolvimento e usará `http://localhost:8000` como URL da API

## Estrutura de Dados

### VoyageData (Input)
```javascript
{
  shipName: string,
  speed: number,              // nós
  duration: number,           // dias
  distance: number,           // milhas náuticas
  beaufortScale: number,      // 0-12
  Area_Molhada: number,       // m²
  MASSA_TOTAL_TON: number,    // toneladas
  TIPO_COMBUSTIVEL_PRINCIPAL: string,
  decLatitude: number,
  decLongitude: number,
  DiasDesdeUltimaLimpeza: number
}
```

### PredictionResult (Output)
```javascript
{
  ship_id: string,
  biofouling_level: number,      // 0-3
  risk_category: string,          // "Low" | "Medium" | "High" | "Critical"
  recommended_action: string,
  estimated_fuel_impact: number,  // %
  confidence_score: number,       // 0-1
  timestamp: string,
  impact_analysis: ImpactAnalysis // Opcional
}
```

## Armazenamento Local

A aplicação usa `localStorage` para:
- Armazenar predições recentes
- Sincronizar dados entre páginas
- Persistir dados do dashboard

Os dados são salvos automaticamente quando predições são feitas.

## CORS

A API já está configurada para aceitar requisições de:
- `http://localhost:3000` (desenvolvimento)
- `https://biofouling-frontend.vercel.app` (produção)

Se precisar adicionar outra origem, avise para atualizar o backend.

## Troubleshooting

### Erro de CORS
- Verifique se a URL da API está correta
- Confirme que o backend está configurado para aceitar requisições do seu domínio

### Dados não aparecem no dashboard
- Verifique o console do navegador para erros
- Confirme que predições foram feitas na página de navios
- Limpe o localStorage se necessário: `localStorage.clear()`

### API não responde
- Verifique a conexão com a internet
- Confirme que a API está online: `https://biofouling-api-454735405258.us-central1.run.app/health`
- Verifique o console do navegador para detalhes do erro

## Suporte

Para mais informações sobre a API, consulte `docs/context.md`.

