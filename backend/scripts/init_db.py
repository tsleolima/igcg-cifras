"""
Script to initialize database with church artist and sample data
Run after: alembic upgrade head
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.artist import Artist
from app.models.user import User
from app.core.security import get_password_hash
from app.core.constants import CHURCH_NAME, DEFAULT_ARTIST_BIO, DEFAULT_ARTIST_IMAGE


async def init_church_artist():
    """Create the main church artist"""
    async with AsyncSessionLocal() as db:
        # Check if artist already exists
        result = await db.execute(select(Artist).where(Artist.id == 1))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✅ Artista já existe: {existing.name}")
            return existing

        # Create church artist
        artist = Artist(
            id=1,
            name=CHURCH_NAME,
            bio=DEFAULT_ARTIST_BIO,
            image_url=DEFAULT_ARTIST_IMAGE,
        )

        db.add(artist)
        await db.commit()
        await db.refresh(artist)

        print(f"✅ Artista criado: {artist.name}")
        return artist


async def init_admin_user():
    """Create admin user if not exists"""
    async with AsyncSessionLocal() as db:
        # Check if admin exists
        result = await db.execute(select(User).where(User.email == "admin@igcg.com"))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✅ Admin já existe: {existing.email}")
            return existing

        # Create admin user
        admin = User(
            email="admin@igcg.com",
            username="admin",
            full_name="Administrador IGCG",
            hashed_password=get_password_hash("admin123"),  # CHANGE IN PRODUCTION!
            is_superuser=True,
            is_active=True,
        )

        db.add(admin)
        await db.commit()
        await db.refresh(admin)

        print(f"✅ Admin criado: {admin.email}")
        print(f"   Senha: admin123 (ALTERE EM PRODUÇÃO!)")
        return admin


async def main():
    """Initialize database with base data"""
    print("🚀 Inicializando banco de dados...")
    print()

    await init_church_artist()
    await init_admin_user()

    print()
    print("✨ Banco de dados inicializado com sucesso!")
    print()
    print("📝 Próximos passos:")
    print("   1. Acesse: http://localhost:8000/docs")
    print("   2. Login com: admin@igcg.com / admin123")
    print("   3. Crie álbuns em /api/v1/albums")
    print("   4. Adicione músicas em /api/v1/songs")


if __name__ == "__main__":
    asyncio.run(main())
