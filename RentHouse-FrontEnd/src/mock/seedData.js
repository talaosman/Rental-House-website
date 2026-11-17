// src/mock/seedData.js
// Demo data used when the app runs without a real backend (see ./mockBackend.js).
// Dates are generated relative to "today" so the demo always looks current.

const day = 24 * 60 * 60 * 1000;
const iso = (d) => d.toISOString().slice(0, 10);
const fromToday = (n) => iso(new Date(Date.now() + n * day));
const img = (id) => `https://images.unsplash.com/photo-${id}?w=1200&q=70&auto=format&fit=crop`;

export const DEMO_ACCOUNTS = {
  admin: { email: "admin@renthouse.demo", password: "admin123" },
  owner: { email: "owner@renthouse.demo", password: "owner123" },
  user: { email: "user@renthouse.demo", password: "user123" },
};

export function buildSeed() {
  const users = [
    { id: 1, username: "Admin", email: DEMO_ACCOUNTS.admin.email, password: DEMO_ACCOUNTS.admin.password, phoneNumber: "+1 555 0100", role: "ADMIN", points: 0, profileImage: null },
    { id: 2, username: "Sarah Mitchell", email: DEMO_ACCOUNTS.owner.email, password: DEMO_ACCOUNTS.owner.password, phoneNumber: "+1 555 0142", role: "HOUSE_OWNER", points: 0, profileImage: null },
    { id: 3, username: "James Carter", email: "james.owner@renthouse.demo", password: "owner123", phoneNumber: "+1 555 0177", role: "HOUSE_OWNER", points: 0, profileImage: null },
    { id: 4, username: "Emily Johnson", email: DEMO_ACCOUNTS.user.email, password: DEMO_ACCOUNTS.user.password, phoneNumber: "+1 555 0123", role: "USER", points: 30, profileImage: null },
    { id: 5, username: "Michael Lee", email: "michael@renthouse.demo", password: "user123", phoneNumber: "+1 555 0188", role: "USER", points: 20, profileImage: null },
    { id: 6, username: "Olivia Brown", email: "olivia@renthouse.demo", password: "user123", phoneNumber: "+1 555 0199", role: "USER", points: 10, profileImage: null },
  ];

  const owners = [
    { id: 1, name: "Sarah Mitchell", email: DEMO_ACCOUNTS.owner.email, phone: "+1 555 0142" },
    { id: 2, name: "James Carter", email: "james.owner@renthouse.demo", phone: "+1 555 0177" },
  ];

  const h = (id, ownerId, title, location, lat, lng, type, beds, perDay, perMonth, photo, description) => ({
    id, ownerId, title, location, latitude: lat, longitude: lng, propertyType: type,
    nbOfBedrooms: beds, pricePerDay: perDay, pricePerMonth: perMonth, image: img(photo),
    description, status: "available", virtualTourUrl: null,
    createdAt: new Date(Date.now() - (40 - id) * day).toISOString(),
  });

  const houses = [
    h(1, 1, "Sunny Family Home with Garden", "Austin", 30.2672, -97.7431, "House", 4, 140, 2900, "1568605114967-8130f3a36994",
      "Bright four-bedroom home with a large fenced garden, open-plan kitchen and two-car garage. Close to schools and parks."),
    h(2, 1, "Modern Downtown Loft", "New York", 40.7128, -74.006, "Apartment", 1, 120, 3200, "1502672260266-1c1ef2d93688",
      "Industrial-style loft with high ceilings, exposed brick and floor-to-ceiling windows in the heart of Manhattan."),
    h(3, 2, "Beachside Villa with Pool", "Miami", 25.7617, -80.1918, "Villa", 5, 260, 4800, "1613490493576-7fde63acd811",
      "Luxury villa a short walk from the beach, with private pool, outdoor kitchen and panoramic ocean views."),
    h(4, 2, "Cozy Studio near the Park", "Chicago", 41.8781, -87.6298, "Studio", 1, 65, 1350, "1522708323590-d24dbb6b0267",
      "Compact, fully furnished studio steps from the park and public transport. Ideal for students and young professionals."),
    h(5, 1, "Classic Suburban House", "Denver", 39.7392, -104.9903, "House", 3, 110, 2400, "1570129477492-45c003edd2be",
      "Well-kept three-bedroom house on a quiet street with mountain views, a sunny porch and a spacious backyard."),
    h(6, 2, "Hillside Modern Retreat", "Los Angeles", 34.0522, -118.2437, "Villa", 4, 230, 4500, "1512917774080-9991f1c4c750",
      "Architect-designed retreat with infinity pool, smart-home features and sweeping city views from every room."),
    h(7, 1, "Bright Corner Apartment", "Seattle", 47.6062, -122.3321, "Apartment", 2, 95, 2200, "1493809842364-78817add7ffb",
      "Two-bedroom corner unit with lots of natural light, balcony and in-unit laundry. Walking distance to cafés."),
    h(8, 2, "Contemporary Glass House", "San Diego", 32.7157, -117.1611, "House", 3, 175, 3600, "1600596542815-ffad4c1539a9",
      "Contemporary home with glass walls, landscaped yard and an indoor-outdoor living area perfect for entertaining."),
    h(9, 1, "Elegant City Condo", "Boston", 42.3601, -71.0589, "Condo", 2, 105, 2600, "1560448204-e02f11c3d0e2",
      "Stylish condo with modern finishes, gym and concierge in the building. Minutes from downtown and the harbor."),
    h(10, 2, "Lakeview Family House", "Chicago", 41.9, -87.65, "House", 4, 130, 2750, "1580587771525-78b9dba3b914",
      "Spacious family house near the lake with a renovated kitchen, finished basement and private parking."),
    h(11, 1, "Minimalist Garden Home", "Austin", 30.29, -97.75, "House", 3, 115, 2350, "1600585154340-be6161a56a0c",
      "Minimalist three-bedroom with a zen garden, home office and energy-efficient design."),
    h(12, 2, "Charming Townhouse", "Boston", 42.35, -71.07, "House", 3, 125, 2700, "1564013799919-ab600027ffc6",
      "Historic townhouse with original details, updated bathrooms and a private patio in a tree-lined neighborhood."),
  ];

  // 360° virtual tours (CC0 panoramas in public/tours, see CREDITS.txt there)
  const tours = {
    1: "/tours/family-home-lounge.jpg",
    2: "/tours/loft-bedroom.jpg",
    5: "/tours/suburban-living-room.jpg",
    8: "/tours/glass-house-bathroom.jpg",
    12: "/tours/townhouse-hall.jpg",
  };
  houses.forEach((house) => { house.virtualTourUrl = tours[house.id] || null; });

  // Rents: some past, one active today (house 3), one upcoming (house 2)
  const rents = [
    { id: 1, houseId: 3, userId: 4, startDate: fromToday(-120), endDate: fromToday(-91), totalPrice: 4800 },
    { id: 2, houseId: 2, userId: 4, startDate: fromToday(-80), endDate: fromToday(-51), totalPrice: 3200 },
    { id: 3, houseId: 7, userId: 4, startDate: fromToday(-40), endDate: fromToday(-11), totalPrice: 2200 },
    { id: 4, houseId: 3, userId: 5, startDate: fromToday(-60), endDate: fromToday(-31), totalPrice: 4800 },
    { id: 5, houseId: 1, userId: 5, startDate: fromToday(-25), endDate: fromToday(-20), totalPrice: 840 },
    { id: 6, houseId: 3, userId: 6, startDate: fromToday(-5), endDate: fromToday(24), totalPrice: 4800 },
    { id: 7, houseId: 2, userId: 5, startDate: fromToday(10), endDate: fromToday(39), totalPrice: 3200 },
  ];

  const favorites = [
    { id: 1, userId: 4, houseId: 3 },
    { id: 2, userId: 4, houseId: 6 },
    { id: 3, userId: 5, houseId: 9 },
  ];

  const ratings = [
    { id: 1, houseId: 3, userId: 4, stars: 5, comment: "Amazing villa, the pool and the view were unforgettable!" },
    { id: 2, houseId: 3, userId: 5, stars: 4, comment: "Great location, very clean. Would stay again." },
    { id: 3, houseId: 2, userId: 4, stars: 5, comment: "Perfect loft for exploring the city." },
    { id: 4, houseId: 7, userId: 4, stars: 4, comment: "Bright and comfortable, friendly owner." },
    { id: 5, houseId: 1, userId: 5, stars: 5, comment: "Kids loved the garden. Highly recommended." },
  ];

  const feedback = [
    { id: 1, userId: 4, message: "Booking my apartment took less than five minutes. Super smooth experience!", submittedAt: new Date(Date.now() - 20 * day).toISOString() },
    { id: 2, userId: 5, message: "Love the virtual tours and the clear pricing. Found my new home in a day.", submittedAt: new Date(Date.now() - 12 * day).toISOString() },
    { id: 3, userId: 6, message: "The loyalty rewards are a great touch. Got 20% off my third rental!", submittedAt: new Date(Date.now() - 4 * day).toISOString() },
  ];

  // Owner offers have userId null; loyalty offers target a user
  const offers = [
    { id: 1, houseId: 5, userId: null, discountPercentage: 15, minPoints: 0, active: true, sameOwnerOnly: false, used: false, expiryDate: fromToday(30) },
    { id: 2, houseId: 4, userId: null, discountPercentage: 10, minPoints: 0, active: true, sameOwnerOnly: false, used: false, expiryDate: fromToday(20) },
    { id: 3, houseId: 7, userId: 4, discountPercentage: 20, minPoints: 0, active: true, sameOwnerOnly: true, used: false, expiryDate: fromToday(25) },
  ];

  return { users, owners, houses, rents, favorites, ratings, feedback, offers, visits: [] };
}
