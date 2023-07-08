const express = require("express");
const bcrypt = require("bcrypt");
const cookieSession = require("cookie-session");
const { generateRandomString, getUserByEmail, urlsForUser } = require("./helpers");

const app = express();
const PORT = 8080;

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: "session",
    keys: ["secretKey"],
  })
);

const users = {};

const urlDatabase = {};

app.get("/", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  if (user) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  if (user) {
    const templateVars = {
      urls: urlsForUser(userId),
      user: user, // Pass the user object as a local variable
    };
    res.render("urls_index", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.get("/urls/new", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  if (user) {
    const templateVars = { user: user }; // Pass the user object as a local variable
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  const shortURL = req.params.shortURL;
  const url = urlDatabase[shortURL];

  if (!url) {
    res.status(404).send("URL Not Found");
  } else if (user && url.userID === userId) {
    const templateVars = {
      shortURL: shortURL,
      longURL: url.longURL,
      user: user, // Pass the user object as a local variable
    };
    res.render("urls_show", templateVars);
  } else if (user && url.userID !== userId) {
    res.status(403).send("Permission Denied");
  } else {
    res.redirect("/login");
  }
});

app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const url = urlDatabase[shortURL];

  if (url) {
    res.redirect(url.longURL);
  } else {
    res.status(404).send("URL Not Found");
  }
});

app.get("/register", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  if (user) {
    res.redirect("/urls");
  } else {
    const templateVars = { user: null };
    res.render("register", templateVars);
  }
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).send("Email and password fields are required.");
    return;
  }

  const user = getUserByEmail(email, users);
  if (user) {
    res.status(400).send("Email is already registered.");
    return;
  }

  const userId = generateRandomString();
  const hashedPassword = bcrypt.hashSync(password, 10);
  users[userId] = {
    id: userId,
    email: email,
    password: hashedPassword,
  };

  req.session.userId = userId;
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  if (user) {
    res.redirect("/urls");
  } else {
    const templateVars = { user: null };
    res.render("login", templateVars);
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);

  if (!user) {
    res.status(403).send("Email not found.");
    return;
  }

  if (!bcrypt.compareSync(password, user.password)) {
    res.status(403).send("Incorrect password.");
    return;
  }

  req.session.userId = user.id;
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

app.post("/urls", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  if (user) {
    const shortURL = generateRandomString();
    const longURL = req.body.longURL;
    urlDatabase[shortURL] = {
      shortURL: shortURL,
      longURL: longURL,
      userID: userId,
    };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.redirect("/login");
  }
});

app.post("/urls/:shortURL", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  const shortURL = req.params.shortURL;
  const newLongURL = req.body.longURL;

  if (user && urlDatabase[shortURL] && urlDatabase[shortURL].userID === userId) {
    urlDatabase[shortURL].longURL = newLongURL;
    res.redirect("/urls");
  } else if (user && urlDatabase[shortURL] && urlDatabase[shortURL].userID !== userId) {
    res.status(403).send("Permission Denied");
  } else {
    res.status(404).send("URL Not Found");
  }
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  const shortURL = req.params.shortURL;

  if (user && urlDatabase[shortURL] && urlDatabase[shortURL].userID === userId) {
    delete urlDatabase[shortURL];
    res.redirect("/urls");
  } else if (user && urlDatabase[shortURL] && urlDatabase[shortURL].userID !== userId) {
    res.status(403).send("Permission Denied");
  } else {
    res.status(404).send("URL Not Found");
  }
});

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});
