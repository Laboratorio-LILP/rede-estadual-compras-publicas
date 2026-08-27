/**
 * MenuSuspenso — o menu de acoes ancorado num gatilho.
 *
 * Comportamento do Radix DropdownMenu: papeis `menu`/`menuitem`, navegacao por
 * setas, busca por digitacao, Esc para fechar, devolucao do foco ao gatilho e
 * `aria-expanded` no gatilho.
 *
 * No legado, a busca e as notificacoes abriam em `onMouseEnter` e fechavam em
 * `onMouseLeave` — eventos que simplesmente nao acontecem para quem navega por
 * tabulacao. Os dois menus eram, na pratica, invisiveis ao teclado.
 */

import * as Menu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

export interface ItemDeMenu {
  chave: string;
  texto: string;
  aoEscolher: () => void;
  /** Acao destrutiva: recebe tratamento visual proprio. */
  perigo?: boolean;
  desabilitado?: boolean;
}

export interface PropriedadesDoMenuSuspenso {
  /** O elemento que abre o menu. Recebe o gatilho por composicao. */
  gatilho: ReactNode;
  itens: ItemDeMenu[];
  /** Lado preferido de abertura; o Radix vira sozinho se nao couber. */
  lado?: "top" | "right" | "bottom" | "left";
}

export function MenuSuspenso({ gatilho, itens, lado = "bottom" }: PropriedadesDoMenuSuspenso) {
  return (
    // `modal={false}` NAO e' ajuste de estilo. O padrao do Radix e' modal, e
    // menu modal marca `aria-hidden="true"` na pagina inteira enquanto esta
    // aberto — sem tornar nada inerte. O resultado e' conteudo escondido do
    // leitor de tela e ainda alcancavel pela tabulacao: `aria-hidden-focus`,
    // gravidade "serious" no axe, que foi como este defeito apareceu.
    //
    // Nao-modal tambem e' o certo pelo padrao WAI-ARIA de menu de botao: menu
    // de acoes nao e' dialogo, e sair dele com Tab deve funcionar.
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>{gatilho}</Menu.Trigger>

      <Menu.Portal>
        <Menu.Content className="menu" side={lado} align="end" sideOffset={6}>
          {itens.map((item) => (
            <Menu.Item
              key={item.chave}
              className={`menu__item${item.perigo ? " menu__item--perigo" : ""}`}
              disabled={item.desabilitado ?? false}
              onSelect={item.aoEscolher}
            >
              {item.texto}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
