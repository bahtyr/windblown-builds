import {describe, expect, it} from "vitest";
import {parseRichDescription} from "../src/core/richTextParser.js";

function parse(html: string) {
  return parseRichDescription(html);
}

// --- Fixtures (keep them separate; don’t concatenate test cases) ---

const HTML_PLAIN = `Hello   \n   world `;
const HTML_NESTED_BOLD = `<b>bold <i>inner</i></b> and <strong>strong</strong>. `;
const HTML_TOOLTIPTEXT_IGNORED = `before <span class="tooltiptext">Ignored</span>after `;
const HTML_EMPTY_TOOLTIP = `<span class="tooltip"><a href="/wiki/Empty"></a></span> `;
const HTML_ENTITY_TOOLTIP =
  `<span class="tooltip"><a href="/wiki/Foo"><img src="/images/foo.png"></a>` +
  `<b><a href="/wiki/Foo"><span style="color: #112233;">Foo</span></a></b></span> is great `;

const FULL_CURSE = `<td style=""><span><span class="tooltip" style="position: relative; display: inline;"><a href="/wiki/Criticals" title=""><img alt="Criticals Icon.png" src="/images/thumb/Criticals_Icon.png/20px-Criticals_Icon.png?c53df9" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><b><a href="/wiki/Criticals" class="mw-redirect" title=""><span style="color: #ffdd00;">Criticals</span></a></b><span class="tooltiptext" style="width: 25em; left: 705px; top: 282px;"><span style="width: 25em;"><a href="/wiki/File:Criticals_Icon.png" class="image" title=""><img alt="Criticals Icon.png" src="/images/thumb/Criticals_Icon.png/20px-Criticals_Icon.png?c53df9" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><span style="font-weight:bold"><span style="color: #ffdd00;">Criticals</span></span> <span style="float: right;">Hit Type</span><br>Hits that deal <b>+50%</b> damage. Most charged attacks and Alterattacks deal Criticals.</span></span></span> apply 1 <span class="tooltip" style="position: relative; display: inline;"><a href="/wiki/Curse" title=""><img alt="Curse Icon.png" src="/images/thumb/Curse_Icon.png/20px-Curse_Icon.png?b90ff2" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><b><a href="/wiki/Curse" class="mw-redirect" title=""><span style="color: #afa2ff;">Curse</span></a></b><span class="tooltiptext" style="width: 25em; left: 773px; top: 279px;"><span style="width: 25em;"><a href="/wiki/File:Curse_Icon.png" class="image" title=""><img alt="Curse Icon.png" src="/images/thumb/Curse_Icon.png/20px-Curse_Icon.png?b90ff2" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><span style="font-weight:bold"><span style="color: #afa2ff;">Curse</span></span> <span style="float: right;">Debuff</span><br>Each stack increases damage dealt to the target by a percentage. At 10 stacks, triggers a <span style="font-weight: bold;"><span class="tooltip" style="position: relative; display: inline;"><a href="/wiki/Final_Curse" title=""><img alt="Final Curse Icon.png" src="/images/thumb/Final_Curse_Icon.png/20px-Final_Curse_Icon.png?a12678" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><b><a href="/wiki/Final_Curse" class="mw-redirect" title=""><span style="color: #afa2ff;">Final Curse</span></a></b></span></span> that multiplies the bonus by 2 for 4s. In this state, stronger Curses replace the bonuses of weaker ones.</span></span></span> (<span class="tooltip" style="position: relative; display: inline;"><a href="/wiki/Auto_Scaling" title=""><img alt="Auto Scaling Icon.png" src="/images/thumb/Auto_Scaling_Icon.png/20px-Auto_Scaling_Icon.png?ceb0bb" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><b><a href="/wiki/Auto_Scaling" class="mw-redirect" title=""><span style="color: #ffffff;"></span></a></b><span class="tooltiptext" style="width: 25em; left: 845px; top: 590px;"><span style="width: 25em;"><a href="/wiki/File:Auto_Scaling_Icon.png" class="image" title=""><img alt="Auto Scaling Icon.png" src="/images/thumb/Auto_Scaling_Icon.png/20px-Auto_Scaling_Icon.png?ceb0bb" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><span style="font-weight:bold"><span style="color: #ffffff;">Auto Scaling</span></span> <span style="float: right;">Mechanic</span><br>Values with this scale automatically with the amount of Bosses killed. <b>Bosses killed: x.</b> </span></span></span><b><span style="color: #00ff22;">5%</span></b>).</span></td>`;
const FULL_Crystallize = `<td style=""><span>Weak foes can be <span class="tooltip" style="position: relative; display: inline;"><a href="/wiki/Crystallize" title=""><img alt="Crystallize Icon.png" src="/images/thumb/Crystallize_Icon.png/20px-Crystallize_Icon.png?7021c1" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><b><a href="/wiki/Crystallize" class="mw-redirect" title=""><span style="color: #0089ff;">Crystallized</span></a></b><span class="tooltiptext" style="width: 25em; left: 739px; top: 378px;"><span style="width: 25em;"><a href="/wiki/File:Crystallize_Icon.png" class="image" title=""><img alt="Crystallize Icon.png" src="/images/thumb/Crystallize_Icon.png/20px-Crystallize_Icon.png?7021c1" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><span style="font-weight:bold"><span style="color: #0089ff;">Crystallize</span></span> <span style="float: right;">Special Attack</span><br>Weaken a strong target until the <a href="/wiki/File:Crystallize_Icon.png" class="image" title=""><img alt="Crystallize Icon.png" src="/images/thumb/Crystallize_Icon.png/20px-Crystallize_Icon.png?7021c1" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a> signal appears. Then, press [Crystallize keybind] to execute them and collect their vital essence.<br>Doing so will occasionally create <span class="tooltip" style="position: relative; display: inline;"><a href="/wiki/Memonites" title=""><img alt="Memonite Dust Icon.png" src="/images/thumb/Memonite_Dust_Icon.png/20px-Memonite_Dust_Icon.png?6b0ee2" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><a href="/wiki/Memonites" title=""><img alt="Memonite Shard Icon.png" src="/images/thumb/Memonite_Shard_Icon.png/20px-Memonite_Shard_Icon.png?f77c8a" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="127"></a><a href="/wiki/Memonites" title=""><img alt="Memonite Fragment Icon.png" src="/images/thumb/Memonite_Fragment_Icon.png/20px-Memonite_Fragment_Icon.png?cd403a" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128"></a><b><a href="/wiki/Memonites" class="mw-redirect" title=""><span style="color: #ffffff;">Memonites</span></a></b></span>. </span></span></span> by the team.</span>
</td>`;

// --- Tests ---

describe("rich text parser", () => {

  it("parses the full real <td> deterministically (no tooltip leaks)", () => {
    const tokens = parse(FULL_Crystallize);
    console.log(JSON.stringify(tokens, null, 2));
    expect(tokens).toEqual([
      {
        "key": "text",
        "text": "Weak foes can be "
      },
      {
        "key": "entity",
        "text": "Crystallized",
        "href": "/wiki/Crystallize",
        "icon": "/images/thumb/Crystallize_Icon.png/20px-Crystallize_Icon.png?7021c1",
        "color": "#0089ff",
        "bold": true
      },
      {
        "key": "text",
        "text": " by the team."
      }
    ]);
  });

  it("parses the full real <td> deterministically (no tooltip leaks)", () => {
    const tokens = parse(FULL_CURSE);
    console.log(JSON.stringify(tokens, null, 2));

    // ✅ Full deterministic output (this is the main thing you asked for)
    expect(tokens).toEqual([
      {
        key: "entity",
        text: "Criticals",
        href: "/wiki/Criticals",
        icon: "/images/thumb/Criticals_Icon.png/20px-Criticals_Icon.png?c53df9",
        color: "#ffdd00",
        bold: true,
      },
      {key: "text", text: " apply 1 "},
      {
        key: "entity",
        text: "Curse",
        href: "/wiki/Curse",
        icon: "/images/thumb/Curse_Icon.png/20px-Curse_Icon.png?b90ff2",
        color: "#afa2ff",
        bold: true,
      },
      {key: "text", text: " ("},
      {
        key: "entity",
        text: "Auto Scaling",
        href: "/wiki/Auto_Scaling",
        icon: "/images/thumb/Auto_Scaling_Icon.png/20px-Auto_Scaling_Icon.png?ceb0bb",
        color: "",
        bold: false,
      },
      {key: "text", text: "5%", color: "#00ff22", bold: true},
      {key: "text", text: ")."},
    ]);

    // ✅ Extra guardrails (makes the failure message *obvious* if tooltiptext isn’t skipped)
    const asText = tokens
      .filter((t) => t.key === "text")
      .map((t) => t.text)
      .join("");

    expect(asText).not.toContain("Hit Type");
    expect(asText).not.toContain("Debuff");
    expect(asText).not.toContain("Bosses killed");
    expect(asText).not.toContain("+50%");

    // ✅ Nested tooltip entity inside tooltiptext must not leak
    expect(tokens.some((t) => t.key === "entity" && t.href === "/wiki/Final_Curse")).toBe(false);

    // ✅ The Auto Scaling “label” is empty in the visible part; should not emit entity
    expect(tokens.some((t) => t.key === "entity" && t.href === "/wiki/Auto_Scaling")).toBe(false);
  });
});