package org.example;

import org.openqa.selenium.By;

import java.util.List;

public class GiftsPage {
    public static final String URL = "https://windblown.wiki.gg/wiki/Gifts";
    public static final List<String> SECTIONS = List.of(
            "General Gifts",
            "Alterattack Gifts",
            "Blast Gifts",
            "Bleed Gifts",
            "Brutality Gifts",
            "Burn Gifts",
            "Corrosive Gifts",
            "Crystallize Gifts",
            "Curse Gifts",
            "Echo Gifts",
            "Freeze Gifts",
            "Goo Gifts",
            "Mark Gifts",
            "Overwhelm Gifts",
            "Rush Gifts",
            "Scythe Gifts"
    );

    static By tableOfSection(String heading) {
        return By.xpath(String.format("//h3[span[text()=\"%s\"]]/following-sibling::p/following-sibling::table/tbody", heading));
    }


}
