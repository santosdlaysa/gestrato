-- CreateTable
CREATE TABLE "politica_de_inadimplencia" (
    "id" TEXT NOT NULL DEFAULT 'padrao',
    "diasParaInadimplencia" INTEGER NOT NULL DEFAULT 8,
    "diasParaRetomadaDoLote" INTEGER NOT NULL DEFAULT 90,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "politica_de_inadimplencia_pkey" PRIMARY KEY ("id")
);
