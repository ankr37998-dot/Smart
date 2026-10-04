import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "A1", "A2", "B1"
    department: { type: String, required: true },
    semester: { type: String, enum: ["1", "2", "3", "4", "5", "6", "7", "8"] },
    description: { type: String }, // Optional description
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

sectionSchema.index({ name: 1, department: 1, semester: 1 }, { unique: true });

const Section = mongoose.model("Section", sectionSchema);

export const ensureSectionSemesterIndex = async () => {
  let indexes = [];
  try {
    indexes = await Section.collection.indexes();
  } catch (error) {
    if (error.code !== 26 && error.codeName !== "NamespaceNotFound") throw error;
  }

  const legacyIndex = indexes.find((index) =>
    index.unique &&
    index.key?.name === 1 &&
    index.key?.department === 1 &&
    index.key?.semester === undefined
  );
  if (legacyIndex) {
    await Section.collection.dropIndex(legacyIndex.name);
  }

  await Section.collection.createIndex(
    { name: 1, department: 1, semester: 1 },
    { unique: true, name: "name_1_department_1_semester_1" }
  );
};

export default Section;
