export default {

  defaultTab: 'Sign In',

  setDefaultTab(newTab) {
    this.defaultTab = newTab;
  },

  // Generate bcrypt password hash
  async generatePasswordHash() {
    return dcodeIO.bcrypt.hashSync(inp_registerPassword.text, 10);
  },

  // Compare password with stored hash
  async verifyHash(password, hash) {
    return dcodeIO.bcrypt.compareSync(password, hash);
  },

  // Generate a JWT token
  async createToken(user) {
    return jsonwebtoken.sign(
      { id: user.id, email: user.email },
      'secret',                     // ⚠️ Replace with env var
      { expiresIn: 60 * 60 }        // 1 hour
    );
  },

  // -----------------------------------------------------------
  // SIGN IN
  // -----------------------------------------------------------
  async signIn() {
    const password = inp_password.text;

    const users = await findUserByEmail.run();
    const user = users?.[0];

    if (!user) {
      return showAlert("No user found with this email", "error");
    }

    const isValid = await this.verifyHash(password, user.password_hash);

    if (isValid) {
      const token = await this.createToken(user);

      await storeValue("token", token);
      await updateLogin.run({ id: user.id });

      return showAlert("Login Success", "success");
    } else {
      return showAlert("Invalid email/password combination", "error");
    }
  },

  // -----------------------------------------------------------
  // REGISTER USER
  // -----------------------------------------------------------
  async register() {
    const passwordHash = await this.generatePasswordHash();

    const users = await createUser.run({ passwordHash });
    const user = users?.[0];

    if (user) {
      const token = await this.createToken(user);
      await storeValue("token", token);

      return showAlert("Register Success", "success");
    } else {
      return showAlert("Error creating new user", "error");
    }
  },
}
