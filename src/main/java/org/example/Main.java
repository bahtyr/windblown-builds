package org.example;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.firefox.FirefoxDriver;

import java.util.List;
import java.util.stream.Collectors;

public class Main {


    static void main() throws InterruptedException {

        WebDriver driver = new FirefoxDriver();
        driver.get(GiftsPage.URL);

        String section = "General Gifts";

        WebElement table = driver.findElement(GiftsPage.tableOfSection(section));
        WebElement row = table.findElements(By.tagName("tr")).get(6);
        List<WebElement> rows = row.findElements(By.tagName("td"));

        Gift a = new Gift();
        a.imageUrl = rows.get(0).findElement(By.tagName("img")).getAttribute("src");
        a.name = rows.get(1).getText();
        a.category = section.replace(" Gifts", "").trim();

        WebElement rowDescription = rows.get(2);
        a.richDescription = RichTextParser.parse(rowDescription).stream()
                .map(RichTextToken::toJsonLikeString)
                .collect(Collectors.joining(",", "[", "]"));

        // on this example
        // [
        //  {
        //    "t": "entity",
        //    "name": "Criticals", // todo use v like the other one.
        //    "href": "/wiki/Criticals",
        //    "icon": "/images/thumb/Criticals_Icon.png/20px-Criticals_Icon.png?c53df9",
        //    "color": "#ffdd00"
        //  },
        //  {
        //    "t": "text",
        //    "v": " refill "
        //  },
        //  {
        //    "t": "bold",
        //    "v": "Trinkets"
        //  },
        //  {
        //    "t": "text",
        //    "v": " by "
        //  },
        //  {
        //    "t": "bold", -- todo color instead
        //    "v": "1s"
        //  },
        //  {
        //    "t": "text",
        //    "v": " (up to 6 times per second)."
        //  }
        //]


        System.out.print(a);

        driver.quit();

    }

}
