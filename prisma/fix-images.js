// Run once: node prisma/fix-images.js
// Updates image paths for seeded rooms to match actual filenames
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const updates = [
  {
    slug: 'classic-deluxe',
    images: ['/images/room-1a.jpg', '/images/room-1b.jpg', '/images/room-1c.jpg'],
  },
  {
    slug: 'classic-garden',
    images: ['/images/room-2a.jpg', '/images/room-1c.jpg'],
  },
  {
    slug: 'forest-cottage',
    images: ['/images/cottage-1a.jpg', '/images/cottage-1b.jpg', '/images/cottage-1c.jpg', '/images/cottage-1d.jpg'],
  },
  {
    slug: 'pond-view-cottage',
    images: ['/images/cottage-2a.jpg', '/images/cottage-2b.jpg', '/images/cottage-1c.jpg', '/images/cottage-1d.jpg'],
  },
]

async function main() {
  console.log('🔧 Fixing image paths...')
  for (const u of updates) {
    await prisma.room.update({
      where: { slug: u.slug },
      data:  { images: u.images },
    })
    console.log(`  ✓ ${u.slug}`)
  }
  console.log('✅ Done!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())