-- CreateTable
CREATE TABLE "personas" (
    "id" SERIAL NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "is_married" BOOLEAN NOT NULL,
    "has_children" BOOLEAN NOT NULL,
    "occupation" TEXT NOT NULL,
    "blog_style" TEXT NOT NULL,
    "blog_tone" TEXT NOT NULL,
    "additional_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
