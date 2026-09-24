// Run with: npm run seed:admin
// Creates (or resets) the first admin account from env vars, or defaults below.
require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const email = process.env.SEED_ADMIN_EMAIL || "admin@cosmicinfra.in";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME || "Cosmic Infra Admin";

  let admin = await Admin.findOne({ email });
  if (admin) {
    admin.password = password;
    admin.name = name;
    await admin.save();
    console.log(`Existing admin ${email} password reset.`);
  } else {
    admin = await Admin.create({ name, email, password, role: "superadmin" });
    console.log(`Admin created: ${email} / ${password}`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
