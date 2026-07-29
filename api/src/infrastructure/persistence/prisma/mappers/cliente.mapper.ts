import type { Cliente as LinhaDeCliente } from '@prisma/client';
import { Cliente } from '../../../../domain/cadastros/cliente.js';
import { Email, Telefone } from '../../../../domain/value-objects/contato.js';
import { CpfCnpj } from '../../../../domain/value-objects/cpf-cnpj.js';
import { deDataCivilOpcional, paraDataCivilOpcional, paraIdentificador } from './conversores.js';

/**
 * Traducao entre a linha de `clientes` e a entidade.
 *
 * O endereco e achatado em colunas no Postgres e volta aninhado no dominio;
 * `tipoPessoa` e coluna derivada do documento — a fonte de verdade continua
 * sendo o value object, que sabe se 11 digitos e CPF e 14 e CNPJ.
 */
export const mapeadorDeCliente = {
  paraDominio(linha: LinhaDeCliente): Cliente {
    return Cliente.restaurar({
      id: paraIdentificador(linha.id),
      nome: linha.nome,
      documento: CpfCnpj.de(linha.documento),
      email: Email.opcional(linha.email),
      telefone: Telefone.opcional(linha.telefone),
      whatsapp: Telefone.opcional(linha.whatsapp),
      dataNascimento: paraDataCivilOpcional(linha.dataNascimento),
      endereco: {
        logradouro: linha.logradouro,
        numero: linha.numero,
        complemento: linha.complemento,
        bairro: linha.bairro,
        cidade: linha.cidade,
        uf: linha.uf,
        cep: linha.cep,
      },
      observacoes: linha.observacoes,
      ativo: linha.ativo,
    });
  },

  paraPersistencia(cliente: Cliente) {
    const estado = cliente.paraEstado();
    return {
      id: estado.id.paraString(),
      nome: estado.nome,
      documento: estado.documento.digitos,
      tipoPessoa: estado.documento.tipoPessoa,
      email: estado.email?.valor ?? null,
      telefone: estado.telefone?.digitos ?? null,
      whatsapp: estado.whatsapp?.digitos ?? null,
      dataNascimento: deDataCivilOpcional(estado.dataNascimento),
      logradouro: estado.endereco.logradouro,
      numero: estado.endereco.numero,
      complemento: estado.endereco.complemento,
      bairro: estado.endereco.bairro,
      cidade: estado.endereco.cidade,
      uf: estado.endereco.uf,
      cep: estado.endereco.cep,
      observacoes: estado.observacoes,
      ativo: estado.ativo,
    };
  },
};
