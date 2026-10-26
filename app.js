const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { WebSocketServer } = require("ws");
const session = require("express-session");
const mongoose = require("mongoose");

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

//mongo connect
const LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/GameStoreDB";
mongoose
  .connect(LOCAL_MONGO_URI)
  .then(() =>
    console.log("MongoDB Database Subsystem Online: " + LOCAL_MONGO_URI),
  )
  .catch((err) => console.error("Database connection fault error:", err));

//mongo setup schema
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  imagePath: { type: String, required: true },
});
const Product = mongoose.model("Product", ProductSchema);

const SaleSchema = new mongoose.Schema({
  saleId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerAddress: { type: String, required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  imagePath: { type: String },
  saleDate: { type: String, default: () => new Date().toISOString() },
});
const Sale = mongoose.model("Sale", SaleSchema);

app.use(express.static(path.join(__dirname, "public")));
// ejs
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/testimg", express.static(path.join(__dirname, "testimg")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// session
app.use(
  session({
    secret: "e_com_secure_secret_crypto_key_2026",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage: storage });

//authntication
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/login");
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    const username = req.session.user.username.toLowerCase();

    if (role === "admin" || username === "admin") {
      return next();
    }
  }
  res
    .status(403)
    .send("Access Denied: Administrative permissions are required.");
};

// websocket refresh
const broadcastRefresh = () => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "REFRESH_DATA" }));
    }
  });
};

//registration
app.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("register", {
      error: "All profile input parameters are required.",
      success: null,
    });
  }

  try {
    const userExists = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, "i") },
    });
    if (userExists) {
      return res.render("register", {
        error: "Username is already registered on this machine.",
        success: null,
      });
    }

    const assignedRole =
      username.trim().toLowerCase() === "admin" ? "admin" : "online_customer";

    const newUser = new User({
      id: "USR-" + Date.now(),
      username: username.trim(),
      password: password,
      role: assignedRole,
    });

    await newUser.save();
    return res.render("register", {
      error: null,
      success: "Account registered successfully! You can now log in.",
    });
  } catch (err) {
    return res.render("register", {
      error: "Database transaction runtime error.",
      success: null,
    });
  }
});

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const matchingUser = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, "i") },
      password: password,
    });

    if (matchingUser) {
      let assignedRole = matchingUser.role || "online_customer";
      if (matchingUser.username.toLowerCase() === "admin") {
        assignedRole = "admin";
      }

      req.session.user = {
        id: matchingUser.id,
        username: matchingUser.username,
        role: assignedRole,
        loginTime: new Date(),
      };

      if (!req.session.cart) req.session.cart = [];

      if (assignedRole === "admin") {
        return res.redirect("/admin/inventory");
      } else {
        return res.redirect("/terminal");
      }
    } else {
      return res.render("login", {
        error: "Invalid Operator Username or Secure Access Pin.",
      });
    }
  } catch (err) {
    return res.render("login", {
      error: "Authentication pipeline execution fault.",
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Error destroying terminal session map:", err);
    res.redirect("/login");
  });
});

//homepage
app.get("/", async (req, res) => {
  try {
    const products = await Product.find({});
    const specialOffers = [
      {
        title: "The Tactical Shooter Pack",
        description:
          "Grab our top-rated FPS titles together for a special price. Locked, loaded, and ready to play.",
        badge: "Pro Level",
      },
      {
        title: "Weekend Flash Sale",
        description:
          "Prices slashed on all RPG titles until Monday. Don't wait, the world-saving adventure starts now.",
        badge: "Flash Sale",
      },
    ];
    res.render("home", { products: products, offers: specialOffers });
  } catch (err) {
    res.status(500).send("Internal Server Execution Error");
  }
});

//dashboard
app.get("/terminal", requireAuth, async (req, res) => {
  try {
    const products = await Product.find({});
    const userCart = req.session.cart || [];
    const cartTotal = userCart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    res.render("dashboard", {
      products: products,
      cart: userCart,
      cartTotal: cartTotal.toFixed(2),
    });
  } catch (err) {
    res.status(500).send("Error reading terminal catalogs.");
  }
});

//admin panel
app.get("/admin/inventory", requireAdmin, async (req, res) => {
  try {
    const products = await Product.find({});
    const sales = await Sale.find({});
    res.render("admin-inventory", { products: products, sales: sales });
  } catch (err) {
    res.status(500).send("Error fetching inventory matrices.");
  }
});

//cart add
app.post("/cart/add", requireAuth, async (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  try {
    const targetProduct = await Product.findOne({ id: productId });

    if (targetProduct) {
      const existingCartItem = req.session.cart.find(
        (item) => item.id === productId,
      );
      if (existingCartItem) {
        existingCartItem.quantity += 1;
      } else {
        // Convert to plain object to attach custom runtime properties cleanly
        req.session.cart.push({ ...targetProduct.toObject(), quantity: 1 });
      }
    }
    return res.redirect("/terminal");
    broadcastRefresh();
  } catch (err) {
    res.redirect("/terminal");
  }
});

//cart remove
app.post("/cart/remove", requireAuth, (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  const itemIndex = req.session.cart.findIndex((item) => item.id === productId);

  if (itemIndex !== -1) {
    if (req.session.cart[itemIndex].quantity > 1) {
      req.session.cart[itemIndex].quantity -= 1;
    } else {
      req.session.cart.splice(itemIndex, 1);
    }
  }

  broadcastRefresh();
  res.redirect("/terminal");
});

app.post("/cart/remove-all", requireAuth, (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  req.session.cart = req.session.cart.filter((item) => item.id !== productId);

  broadcastRefresh();
  res.redirect("/terminal");
});

//checkout
app.post("/cart/checkout", requireAuth, async (req, res) => {
  const userCart = req.session.cart || [];

  if (userCart.length === 0) {
    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }
    return res.redirect("/terminal");
  }

  const customerName = req.body.customerName || "Valued Customer";
  const customerAddress = req.body.customerAddress || "Walk-in Counter Sale";

  try {
    const salesDocs = userCart.map((item) => ({
      saleId: "SALE-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      customerName: customerName,
      customerAddress: customerAddress,
      productName: item.name,
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity),
      totalAmount: parseFloat((item.price * item.quantity).toFixed(2)),
      imagePath: item.imagePath,
      saleDate: new Date().toISOString(),
    }));

    await Sale.insertMany(salesDocs);

    req.session.cart = [];
    if (req.session.cartTotal) req.session.cartTotal = "0.00";

    if (typeof broadcastRefresh === "function") {
      broadcastRefresh();
    }

    if (
      req.xhr ||
      req.headers.accept.indexOf("json") > -1 ||
      (req.headers["content-type"] &&
        req.headers["content-type"].includes(
          "application/x-www-form-urlencoded",
        ))
    ) {
      return res
        .status(200)
        .json({ success: true, message: "Transaction completed successfully" });
    }

    res.redirect("/checkout-success");
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to persist checkout entries." });
  }
});
//add product
app.post(
  "/product/create",
  requireAdmin,
  upload.single("newProductImage"),
  async (req, res) => {
    const { newProductName, newProductPrice } = req.body;

    if (!req.file)
      return res
        .status(400)
        .send("Product layouts require an illustration attachment file.");

    try {
      const newProduct = new Product({
        id: "PROD-" + Date.now(),
        name: newProductName,
        price: parseFloat(newProductPrice),
        imagePath: `/uploads/${req.file.filename}`,
      });

      await newProduct.save();
      broadcastRefresh();
      res.redirect("/admin/inventory");
    } catch (err) {
      res.status(500).send("Inventory execution engine write database fault.");
    }
  },
);

//update product
app.post(
  "/product/update",
  requireAdmin,
  upload.single("updateProductImage"),
  async (req, res) => {
    const { productId, updateProductName, updateProductPrice } = req.body;

    try {
      const updateFields = {
        name: updateProductName,
        price: parseFloat(updateProductPrice),
      };

      if (req.file) {
        updateFields.imagePath = `/uploads/${req.file.filename}`;
      }

      const updatedProduct = await Product.findOneAndUpdate(
        { id: productId },
        updateFields,
        { new: true },
      );

      if (updatedProduct && req.session && req.session.cart) {
        req.session.cart = req.session.cart.map((item) => {
          if (item.id === productId) {
            return {
              ...item,
              name: updateProductName,
              price: parseFloat(updateProductPrice),
              imagePath: req.file
                ? `/uploads/${req.file.filename}`
                : item.imagePath,
            };
          }
          return item;
        });
      }

      broadcastRefresh();
      res.redirect("/admin/inventory");
    } catch (err) {
      res.status(500).send("Product update operations encountered errors.");
    }
  },
);

//delete product
app.post("/product/delete", requireAdmin, async (req, res) => {
  const { productId } = req.body;

  try {
    const targetProduct = await Product.findOne({ id: productId });

    if (!targetProduct) {
      return res.send(`
        <script>
          alert("Error: Product record could not be located.");
          window.location.href = "/admin/inventory";
        </script>
      `);
    }

    await Product.deleteOne({ id: productId });

    if (req.session && req.session.cart) {
      req.session.cart = req.session.cart.filter(
        (item) => item.id !== productId,
      );
    }

    broadcastRefresh();
    res.redirect("/admin/inventory");
  } catch (err) {
    res.redirect("/admin/inventory");
  }
});

//sales history
app.get("/sales", requireAdmin, async (req, res) => {
  try {
    const sales = await Sale.find({}).sort({ _id: -1 });
    res.render("sales-log", { sales: sales });
  } catch (err) {
    res.status(500).send("Could not retrieve sales receipts logs ledger.");
  }
});

// realtime websocket
wss.on("connection", (socket) => {
  console.log("A client connected via WebSocket.");

  socket.on("message", (rawData) => {
    try {
      const data = JSON.parse(rawData);

      if (data.type === "CHAT_MSG") {
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(
              JSON.stringify({
                type: "CHAT_MSG",
                sender: data.sender,
                message: data.message,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }),
            );
          }
        });
      }
    } catch (err) {
      console.error(
        "Error processing WebSocket message pipeline payload:",
        err,
      );
    }
  });
});

app.get("/checkout-success", requireAuth, (req, res) => {
  res.render("checkout-success");
});

// Boot listening operation to server instance
server.listen(PORT, () =>
  console.log("E-Commerce Engine online at http://localhost:" + PORT),
);
