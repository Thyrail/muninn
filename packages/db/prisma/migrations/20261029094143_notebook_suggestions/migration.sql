-- AlterTable
ALTER TABLE "notebook" ADD COLUMN     "suggestedQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "suggestionsKey" TEXT;
