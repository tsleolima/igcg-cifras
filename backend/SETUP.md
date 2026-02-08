# 🚀 Setup Rápido - IGCGMusic

## 📋 Pré-requisitos

- Python 3.11+
- PostgreSQL 14+
- Redis 7+

---

## ⚡ Setup em 5 minutos

### **1. Instalar dependências**
```bash
pip install -r requirements.txt
```

### **2. Configurar ambiente**
```bash
cp .env.example .env
# Edite .env com suas configurações
```

Principais variáveis:
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/igcgmusic
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=sua-chave-secreta-aqui-min-32-chars
```

### **3. Criar banco de dados**
```bash
# PostgreSQL
createdb igcgmusic
```

### **4. Criar tabelas**

**Opção A: Via Python** ✅ *Recomendado*
```bash
python scripts/create_tables.py
```

**Opção B: Via SQL direto**
```bash
psql igcgmusic < scripts/schema.sql
```

### **5. Importar dados**
```bash
# 1. Criar artista da igreja + admin
python scripts/init_db.py

# 2. Importar 1352 músicas do db.json
python scripts/import_songs_from_json.py
```

### **6. Iniciar servidor**
```bash
uvicorn app.main:app --reload
```

Acesse: http://localhost:8000/docs

---

## 🎯 Credenciais Padrão

Após o setup:

**Admin:**
- Email: `admin@igcg.com`
- Senha: `admin123`
- ⚠️ **MUDE EM PRODUÇÃO!**

---

## 🔄 Comandos Úteis

### **Ver estatísticas do banco**
```bash
python scripts/import_songs_from_json.py --stats
```

### **Recriar banco do zero**
```bash
# CUIDADO: Apaga tudo!
python scripts/create_tables.py --drop
python scripts/create_tables.py
python scripts/init_db.py
python scripts/import_songs_from_json.py
```

### **Testar API**
```bash
# Verificar saúde
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@igcg.com","password":"admin123"}'
```

---

## 📂 Estrutura do Projeto

```
backend_igcg/
├── app/
│   ├── api/v1/endpoints/    # Rotas da API
│   ├── core/                # Config, security
│   ├── db/                  # Database, Redis
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   └── main.py              # FastAPI app
├── scripts/
│   ├── create_tables.py     # Criar schema
│   ├── schema.sql           # Schema SQL
│   ├── init_db.py           # Dados iniciais
│   └── import_songs_from_json.py  # Importar músicas
├── uploads/                 # Arquivos
├── db.json                  # 1352 músicas
├── requirements.txt
└── .env.example
```

---

## 🐳 Docker (Opcional)

### **PostgreSQL via Docker**
```bash
docker run --name igcg-postgres -e POSTGRES_PASSWORD=senha123 \
  -e POSTGRES_DB=igcgmusic -p 5432:5432 -d postgres:14
```

### **Redis via Docker**
```bash
docker run --name igcg-redis -p 6379:6379 -d redis:7
```

---

## 🛠️ Troubleshooting

### **Erro: "relation does not exist"**
```bash
# Recrear tabelas
python scripts/create_tables.py
```

### **Erro: "could not connect to server"**
```bash
# Verificar PostgreSQL
pg_isready

# Verificar Redis
redis-cli ping
```

### **Erro: "asyncpg connection timeout"**
```bash
# Verificar DATABASE_URL no .env
# Formato: postgresql+asyncpg://user:pass@host:5432/dbname
```

### **Importação falha**
```bash
# Verificar se init_db.py foi executado
# Deve existir artista com ID=1
```

---

## 📊 Após o Setup

Você terá:
- ✅ 1 artista (Igreja IGCG)
- ✅ 1 admin (admin@igcg.com)
- ✅ ~45 álbuns criados automaticamente
- ✅ 1352 músicas importadas
- ✅ Detecção automática de idioma (pt/en/es)

**Próximos passos:**
1. Adicionar letras às músicas (via API ou script)
2. Adicionar cifras
3. Criar usuários de teste
4. Customizar configurações

---

## 🎵 Começar a usar

```bash
# 1. Login na API
POST /api/v1/auth/login
{
  "email": "admin@igcg.com",
  "password": "admin123"
}

# 2. Ver Top 10
GET /api/v1/songs/top

# 3. Buscar músicas
GET /api/v1/search/songs?q=amor

# 4. Criar usuário
POST /api/v1/auth/register
```

Documentação completa: http://localhost:8000/docs

---

**Pronto! Seu backend está rodando! 🎉**
