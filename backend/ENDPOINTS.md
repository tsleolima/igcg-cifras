# 📚 Resumo Completo dos Endpoints - IGCGMusic API

## 🔐 **Autenticação** (`/api/v1/auth`)

### **POST /auth/register**
Registra novo usuário
```json
// Request
{
  "email": "user@example.com",
  "username": "joao",
  "password": "senha123",
  "full_name": "João Silva"
}

// Response (201)
{
  "id": 1,
  "email": "user@example.com",
  "username": "joao",
  "full_name": "João Silva",
  "avatar_url": null,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00"
}
```

### **POST /auth/login**
Login e recebe tokens JWT
```json
// Request
{
  "email": "user@example.com",
  "password": "senha123"
}

// Response
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### **POST /auth/refresh**
Renova access token usando refresh token
```json
// Request (query param)
?refresh_token=eyJ...

// Response
{
  "access_token": "novo_eyJ...",
  "refresh_token": "novo_eyJ...",
  "token_type": "bearer"
}
```

---

## 👤 **Usuários** (`/api/v1/users`)
*Requer autenticação*

### **GET /users/me**
Retorna dados do usuário logado
```json
// Response
{
  "id": 1,
  "email": "user@example.com",
  "username": "joao",
  "full_name": "João Silva",
  "avatar_url": "https://...",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00"
}
```

### **PUT /users/me**
Atualiza dados do usuário logado
```json
// Request
{
  "full_name": "João Silva Santos",
  "avatar_url": "https://nova-foto.jpg",
  "password": "nova_senha123"  // opcional
}
```

---

## 🎵 **Músicas** (`/api/v1/songs`)
*Requer autenticação*

### **GET /songs** ⭐ *Com filtros*
Lista músicas com paginação e múltiplos filtros
```http
GET /songs?skip=0&limit=20
GET /songs?language=pt           // Filtrar por idioma
GET /songs?genre=Gospel          // Filtrar por gênero
GET /songs?album_id=5            // Filtrar por álbum
GET /songs?artist_id=1           // Filtrar por artista
GET /songs?favorites_only=true   // Apenas favoritas do usuário

// Combinar filtros
GET /songs?language=pt&album_id=5&skip=0&limit=20
```

**Filtros disponíveis:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `skip` | int | Offset para paginação (padrão: 0) |
| `limit` | int | Limite de resultados (padrão: 20, máx: 100) |
| `language` | string | Idioma: `pt`, `en`, `es` |
| `genre` | string | Gênero musical |
| `album_id` | int | ID do álbum |
| `artist_id` | int | ID do artista |
| `favorites_only` | bool | Apenas favoritas (padrão: false) |

```json
// Response
[
  {
    "id": 1,
    "title": "A Benção de Abraão",
    "duration": 178,
    "audio_url": "https://...",
    "cover_url": "https://...",
    "lyrics": null,
    "lyrics_with_chords": null,
    "language": "pt",
    "genre": "Gospel",
    "play_count": 1452,
    "artist_id": 1,
    "album_id": 5,
    "is_favorited": false,
    "created_at": "2024-01-01T00:00:00"
  }
]
```

### **GET /songs/top**
Top músicas mais tocadas (CACHE 5min)
```http
GET /songs/top?limit=10
```

### **GET /songs/{id}**
Detalhes de uma música específica

### **POST /songs** *(Admin only)*
Criar nova música
```json
// Request
{
  "title": "Nova Música",
  "duration": 240,
  "audio_url": "https://storage.../musica.mp3",
  "cover_url": "https://...",
  "lyrics": "Letra...",
  "lyrics_with_chords": "Am\nCifras...",
  "language": "pt",
  "genre": "Gospel",
  "album_id": 5
}
// artist_id é setado automaticamente como 1 (igreja)
```

### **PUT /songs/{id}** *(Admin only)*
Atualizar música (sem delete!)

### **POST /songs/{id}/play**
Incrementa contador de plays
```json
// Response
{
  "message": "Play count incremented",
  "play_count": 1453
}
```

### **GET /songs/{id}/lyrics**
Busca letra da música
```http
GET /songs/1/lyrics                      // Letra simples
GET /songs/1/lyrics?include_chords=true  // Com cifras
```
```json
// Response
{
  "song_id": 1,
  "title": "A Benção de Abraão",
  "artist": "Igreja Geração Cristo de Glória",
  "album": "O Valor de Um Grande Amor",
  "language": "pt",
  "lyrics": "Letra ou cifras aqui...",
  "has_chords": true
}
```

---

## 🎤 **Artistas** (`/api/v1/artists`)
*Requer autenticação*

### **GET /artists**
Lista artistas (na prática, sempre será a igreja)

### **GET /artists/top**
Top artistas por plays (CACHE 5min)

### **GET /artists/{id}**
Detalhes do artista

---

## 📀 **Álbuns** (`/api/v1/albums`)
*Requer autenticação*

### **GET /albums**
Lista álbuns da igreja
```http
GET /albums?skip=0&limit=20
```

### **GET /albums/{id}**
Detalhes do álbum

### **GET /albums/{id}/songs**
Lista músicas de um álbum específico
```json
// Response
[
  {
    "id": 1,
    "title": "A Benção de Abraão",
    "duration": 178,
    "language": "pt",
    // ... resto dos campos
  }
]
```

### **POST /albums** *(Admin only)*
Criar álbum
```json
// Request
{
  "title": "Louvores 2024",
  "cover_url": "https://...",
  "release_year": 2024
}
// artist_id é setado automaticamente como 1
```

---

## ❤️ **Favoritos** (`/api/v1/favorites`)
*Requer autenticação*

### **GET /favorites**
Lista músicas favoritas do usuário
```http
GET /favorites?skip=0&limit=20
```

> **Dica:** Use `GET /songs?favorites_only=true` para o mesmo resultado

### **POST /favorites/{song_id}**
Adiciona música aos favoritos
```json
// Response (201)
{
  "id": 1,
  "user_id": 5,
  "song_id": 123,
  "created_at": "2024-01-01T00:00:00"
}
```

### **DELETE /favorites/{song_id}**
Remove música dos favoritos
```
Response: 204 No Content
```

### **GET /favorites/check/{song_id}**
Verifica se música está favoritada
```json
// Response
{
  "song_id": 123,
  "is_favorited": true
}
```

---

## 📋 **Playlists** (`/api/v1/playlists`)
*Requer autenticação*

### **GET /playlists**
Lista playlists públicas + do usuário
```http
GET /playlists?skip=0&limit=20&public_only=false
```
```json
// Response
[
  {
    "id": 1,
    "name": "Minhas Favoritas",
    "description": "Hinos que mais gosto",
    "cover_url": "https://...",
    "is_public": false,
    "owner_id": 5,
    "owner_username": "joao",
    "song_count": 15,
    "created_at": "2024-01-01T00:00:00"
  }
]
```

### **GET /playlists/my**
Apenas playlists do usuário logado

### **GET /playlists/{id}**
Detalhes da playlist com músicas
```json
// Response
{
  "id": 1,
  "name": "Minhas Favoritas",
  "songs": [
    {
      "id": 1,
      "title": "A Benção de Abraão",
      "duration": 178,
      "cover_url": "...",
      "artist_name": "Igreja IGCG",
      "position": 0
    }
  ]
}
```

### **POST /playlists**
Criar playlist

### **PUT /playlists/{id}**
Atualizar playlist (apenas dono)

### **DELETE /playlists/{id}**
Deletar playlist (apenas dono)

### **POST /playlists/{id}/songs**
Adicionar música à playlist
```json
// Request
{
  "song_id": 123,
  "position": 0  // opcional, null = adiciona no final
}
```

### **DELETE /playlists/{id}/songs/{song_id}**
Remover música da playlist

---

## 🔍 **Busca** (`/api/v1/search`)
*Requer autenticação*

### **GET /search/songs**
Busca músicas por título, artista ou gênero
```http
GET /search/songs?q=amor&limit=20
```

### **GET /search/artists**
Busca artistas por nome

### **GET /search/playlists**
Busca playlists públicas + do usuário

### **GET /search/all**
Busca global em tudo
```http
GET /search/all?q=amor&limit_per_type=5
```
```json
// Response
{
  "songs": [...],      // até 5 músicas
  "artists": [...],    // até 5 artistas
  "playlists": [...]   // até 5 playlists
}
```

---

## 🎯 **Exemplos de Uso Comum**

### **1. Listar músicas em português de um álbum**
```http
GET /api/v1/songs?language=pt&album_id=5&skip=0&limit=20
```

### **2. Ver apenas favoritas do usuário**
```http
GET /api/v1/songs?favorites_only=true
```

### **3. Músicas em inglês**
```http
GET /api/v1/songs?language=en
```

### **4. Gospel do álbum específico**
```http
GET /api/v1/songs?genre=Gospel&album_id=3
```

### **5. Favoritas em português**
```http
GET /api/v1/songs?favorites_only=true&language=pt
```

---

## 📌 **Notas Importantes**

### **Headers obrigatórios:**
```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

### **Paginação padrão:**
- `skip=0` (offset)
- `limit=20` (máx: 100)

### **Cache:**
- Top 10 músicas: 5 minutos
- Top artistas: 5 minutos

### **Performance:**
- Async/await em tudo
- Connection pooling (20 conexões)
- Eager loading (joinedload)
- GZip compression

---

## 🚀 **Fluxo Típico**

### **Usuário escuta músicas:**
```
1. GET /songs?language=pt&skip=0&limit=20  // Lista músicas em português
2. POST /songs/123/play                     // Toca música
3. GET /songs/123/lyrics?include_chords=true // Mostra cifra
4. POST /favorites/123                      // Adiciona aos favoritos
```

### **Criar playlist:**
```
1. POST /playlists                    // Cria playlist
2. POST /playlists/1/songs           // Adiciona músicas
3. PUT /playlists/1 {is_public: true} // Torna pública
```

### **Admin gerencia músicas:**
```
1. POST /albums                       // Cria álbum
2. POST /songs                        // Adiciona música
3. PUT /songs/999                     // Atualiza letra/cifra
```

---

Documentação completa: http://localhost:8000/docs
