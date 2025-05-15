const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_WORK_FACTOR = 10;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: String,
    lastName: String,
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    refreshToken: String,
  },
  {
    timestamps: true,
  }
);

// Hash du mot de passe avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Comparaison mot de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Formatage pour gRPC (selon ton proto)
userSchema.methods.toProto = function () {
  return {
    id: this._id.toString(),
    email: this.email,
    firstName: this.firstName || "",
    lastName: this.lastName || "",
    role: this.role || "",
    createdAt: this.createdAt ? this.createdAt.toISOString() : "",
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : "",
  };
};

const User = mongoose.model("User", userSchema);
module.exports = User;
