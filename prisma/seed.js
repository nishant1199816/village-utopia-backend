// prisma/seed.js
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rooms = [
  // ── Classic Rooms ──────────────────────────────
  {
    name: 'Classic Deluxe Room',
    slug: 'classic-deluxe',
    type: 'ROOM',
    price: 3500,
    capacity: 2,
    size: '320 sq ft',
    badge: 'Most Popular',
    description: 'Warmly appointed with rich maroon and gold accents. Platform king bed, wall sconces, and an attached bathroom with modern fittings. Select rooms open to a private balcony.',
    highlights: ['Platform king bed', 'Marble flooring', 'Wall sconces', 'Mirror alcove'],
    amenities: ['AC', 'Ceiling Fan', 'LED TV', 'Attached Bathroom', 'Work Desk', 'Room Service'],
    images: ['/images/room-1.jpg', '/images/room-3.jpg', '/images/room-4.jpg', '/images/bath-1.jpg'],
  },
  {
    name: 'Classic Garden View',
    slug: 'classic-garden',
    type: 'ROOM',
    price: 3000,
    capacity: 2,
    size: '300 sq ft',
    badge: null,
    description: 'Light-filled rooms facing the palm-lined garden corridor. French windows frame the greenery while you unwind in comfort.',
    highlights: ['Garden-facing balcony', 'King or twin beds', 'Custom curtains'],
    amenities: ['AC', 'Ceiling Fan', 'LED TV', 'Attached Bathroom', 'Work Desk'],
    images: ['/images/room-3.jpg', '/images/room-1.jpg', '/images/bath-1.jpg'],
  },
  // ── Forest Cottages ───────────────────────────
  {
    name: 'Forest Cottage',
    slug: 'forest-cottage',
    type: 'COTTAGE',
    price: 5500,
    capacity: 2,
    size: '450 sq ft',
    badge: 'Premium',
    description: 'Soaring pine A-frame ceilings, warm wooden walls, marble floors. Private verandah with rattan lounge chair and direct garden access.',
    highlights: ['A-frame pine ceiling', 'Private verandah', 'Floating vanity bathroom', 'Mini fridge + kettle'],
    amenities: ['AC', 'LED TV', 'Mini Fridge', 'Work Desk', 'Wardrobe', 'Private Porch', 'Premium Bathroom'],
    images: ['/images/cottage-9.jpg', '/images/cottage-11.jpg', '/images/cottage-6.jpg', '/images/cottage-7.jpg'],
  },
  {
    name: 'Pond View Cottage',
    slug: 'pond-view-cottage',
    type: 'COTTAGE',
    price: 6000,
    capacity: 2,
    size: '480 sq ft',
    badge: 'Best View',
    description: 'Overlooking our serene lotus pond and thatched gazebo. Rustic wooden architecture meets luxury — wake up to shimmering water through your window.',
    highlights: ['Direct pond view', 'Gazebo access', 'A-frame ceiling', 'Large glass windows'],
    amenities: ['AC', 'LED TV', 'Mini Fridge', 'Work Desk', 'Wardrobe', 'Private Porch', 'Premium Bathroom', 'Pond View'],
    images: ['/images/cottage-10.jpg', '/images/cottage-9.jpg', '/images/cottage-12.jpg', '/images/cottage-7.jpg'],
  },
]

async function main() {
  console.log('🌱 Seeding rooms...')
  for (const r of rooms) {
    await prisma.room.upsert({
      where:  { slug: r.slug },
      update: r,
      create: r,
    })
    console.log(`  ✓ ${r.name}`)
  }
  console.log('✅ Seed complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
