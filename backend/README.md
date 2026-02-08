# 🎵 IGCGMusic API

Backend de alta performance para plataforma de streaming de música construído com FastAPI, PostgreSQL e Redis.

## 🚀 Funcionalidades

### Autenticação & Usuários
- ✅ Registro e login de usuários
- ✅ Autenticação JWT com refresh tokens
- ✅ Perfil de usuário com avatar
- ✅ Atualização de dados do usuário

### Músicas
- ✅ CRUD de músicas (sem delete)
- ✅ Listagem com filtros (gênero, artista)
- ✅ Top 10 músicas mais tocadas (com cache)
- ✅ Contador de plays
- ✅ Histórico de reprodução
- ✅ Sistema de favoritos (likes)

### Artistas
- ✅ CRUD de artistas
- ✅ Top artistas por plays
- ✅ Listagem de músicas por artista

### Playlists
- ✅ CRUD completo de playlists
- ✅ Playlists públicas e privadas
- ✅ Adicionar/remover músicas
- ✅ Ordenação de músicas por posição
- ✅ Compartilhamento de playlists públicas

### Busca
- ✅ Busca global (músicas, artistas, playlists)
- ✅ Busca específica por tipo
- ✅ Busca otimizada com índices

## 🏗️ Arquitetura

```
backend_igcg/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py          # Autenticação
│   │       │   ├── users.py         # Usuários
│   │       │   ├── songs.py         # Músicas
│   │       │   ├── artists.py       # Artistas
│   │       │   ├── playlists.py     # Playlists
│   │       │   ├── favorites.py     # Favoritos
│   │       │   └── search.py        # Busca
│   │       └── router.py
│   ├── core/
│   │   ├── config.py                # Configurações
│   │   └── security.py              # JWT & Auth
│   ├── db/
│   │   ├── session.py               # Database session
│   │   └── redis.py                 # Redis cache
│   ├── models/                      # SQLAlchemy models
│   ├── schemas/                     # Pydantic schemas
│   └── main.py                      # FastAPI app
├── alembic/                         # Database migrations
├── uploads/                         # Arquivos enviados
├── requirements.txt
└── .env.example
```

## ⚡ Otimizações de Performance

### 1. **Database Connection Pooling**
- Pool size configurável (padrão: 20)
- Max overflow: 10
- Pool recycle: 1 hora
- Pre-ping habilitado

### 2. **Redis Caching**
- Top 10 músicas (TTL: 5 min)
- Top artistas (TTL: 5 min)
- Invalidação automática em updates

### 3. **Async/Await**
- Todas operações I/O são assíncronas
- PostgreSQL com asyncpg
- Redis com redis.asyncio

### 4. **Query Optimization**
- Índices em campos críticos
- Eager loading com joinedload
- Paginação em todas listagens

### 5. **Response Compression**
- GZip middleware para respostas > 1KB

## 🛠️ Tecnologias

- **FastAPI** 0.109+ - Framework web async
- **SQLAlchemy** 2.0+ - ORM com suporte async
- **PostgreSQL** - Banco de dados principal
- **Redis** - Cache e sessões
- **Pydantic** V2 - Validação de dados
- **JWT** - Autenticação stateless

## 📦 Instalação

### 1. Clone o repositório
```bash
cd backend_igcg
```

### 2. Crie ambiente virtual
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

### 3. Instale dependências
```bash
pip install -r requirements.txt
```

### 4. Configure variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com suas configurações
```

### 5. Configure PostgreSQL e Redis
```bash
# PostgreSQL
createdb igcgmusic

# Redis (deve estar rodando)
redis-server
```

### 6. Criar tabelas no banco
Escolha uma das opções:

**Opção 1: Via Python (recomendado)**
```bash
python scripts/create_tables.py
```

**Opção 2: Via SQL direto**
```bash
psql igcgmusic < scripts/schema.sql
```

### 7. Inicializar dados base
```bash
# Cria artista da igreja + admin
python scripts/init_db.py

# Importar músicas do db.json (1352 músicas!)
python scripts/import_songs_from_json.py
```

### 8. Execute o servidor
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

wsl 

redis-cli
```

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔐 Autenticação

### Registrar usuário
```bash
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "username": "username",
  "password": "senha123",
  "full_name": "Nome Completo"
}
```

### Login
```bash
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "senha123"
}
```

Resposta:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Usar token
Adicione o header em todas requisições autenticadas:
```
Authorization: Bearer {access_token}
```

## 📊 Endpoints Principais

### Músicas
- `GET /api/v1/songs` - Listar músicas
- `GET /api/v1/songs/top` - Top 10 músicas
- `GET /api/v1/songs/{id}` - Detalhes da música
- `POST /api/v1/songs` - Criar música (admin)
- `PUT /api/v1/songs/{id}` - Atualizar música (admin)
- `POST /api/v1/songs/{id}/play` - Incrementar play count

### Playlists
- `GET /api/v1/playlists` - Listar playlists
- `GET /api/v1/playlists/my` - Minhas playlists
- `POST /api/v1/playlists` - Criar playlist
- `PUT /api/v1/playlists/{id}` - Atualizar playlist
- `DELETE /api/v1/playlists/{id}` - Deletar playlist
- `POST /api/v1/playlists/{id}/songs` - Adicionar música
- `DELETE /api/v1/playlists/{id}/songs/{song_id}` - Remover música

### Favoritos
- `GET /api/v1/favorites` - Listar favoritos
- `POST /api/v1/favorites/{song_id}` - Adicionar favorito
- `DELETE /api/v1/favorites/{song_id}` - Remover favorito

### Busca
- `GET /api/v1/search/all?q=termo` - Busca global
- `GET /api/v1/search/songs?q=termo` - Buscar músicas
- `GET /api/v1/search/artists?q=termo` - Buscar artistas
- `GET /api/v1/search/playlists?q=termo` - Buscar playlists

## 🗄️ Modelo de Dados

### Principais Entidades

- **User**: Usuários da plataforma
- **Song**: Músicas com metadata
- **Artist**: Artistas
- **Album**: Álbuns
- **Playlist**: Playlists de usuários
- **PlaylistSong**: Relação música-playlist (com posição)
- **UserFavorite**: Músicas favoritas
- **PlayHistory**: Histórico de reprodução

## 🔧 Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/igcgmusic
DB_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

## 🚀 Deploy

### Docker (Recomendado)
```dockerfile
# TODO: Adicionar Dockerfile
```

### Manual
1. Configure PostgreSQL e Redis em produção
2. Configure variáveis de ambiente
3. Execute migrações: `alembic upgrade head`
4. Use servidor ASGI: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`

## 📈 Próximos Passos

- [ ] Upload de arquivos (músicas, capas)
- [ ] Sistema de streaming de áudio
- [ ] Playlists colaborativas
- [ ] Sistema de seguidores
- [ ] Recomendações personalizadas
- [ ] WebSocket para player em tempo real
- [ ] Testes unitários e integração
- [ ] Docker & Docker Compose
- [ ] CI/CD

## 📝 Licença

MIT

## 👤 Autor

IGCGMusic Team
