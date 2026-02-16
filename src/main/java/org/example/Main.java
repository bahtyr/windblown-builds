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

        String section = "Scythe Gifts";

        WebElement table = driver.findElement(GiftsPage.tableOfSection(section));
        WebElement row = table.findElements(By.tagName("tr")).get(1);
        List<WebElement> rows = row.findElements(By.tagName("td"));

        Gift a = new Gift();
        a.imageUrl = rows.get(0).findElement(By.tagName("img")).getAttribute("src");
        a.name = rows.get(0).getText();
        a.category = section.replace(" Gifts", "").trim();

        WebElement rowDescription = rows.get(2);
        a.richDescription = RichTextParser.parse(rowDescription).stream()
                .map(RichTextToken::toJsonLikeString)
                .collect(Collectors.joining(",", "[", "]"));

        /*
        {
  "imageUrl": "https://windblown.wiki.gg/images/thumb/Damage_Scythe_Icon.png/48px-Damage_Scythe_Icon.png?2431b1",
  "name": "",
  "category": "Scythe",
  "richDescription": [
    {
      "t": "text",
      "v": "Every "
    },
    {
      "t": "bold",
      "v": "250"
    },
    {
      "t": "entity",
      "v": "Base Damage",
      "href": "/wiki/Base_Damage",
      "color": "#ffffff"
    },
    {
      "t": "text",
      "v": " you deal, spawn a "
    },
    {
      "t": "entity",
      "v": "Scythe",
      "href": "/wiki/Scythe",
      "icon": "/images/thumb/Scythe_Icon.png/20px-Scythe_Icon.png?16e570",
      "color": "#5f9fff"
    },
    {
      "t": "text",
      "v": " for 5s ("
    },
    {
      "t": "entity",
      "v": "",
      "href": "/wiki/Auto_Scaling",
      "icon": "/images/thumb/Auto_Scaling_Icon.png/20px-Auto_Scaling_Icon.png?ceb0bb",
      "color": "#ffffff"
    },
    {
      "t": "number",
      "v": "10",
      "color": "#00ff22"
    },
    {
      "t": "text",
      "v": " damage)."
    }
  ]
}
         */

                /*

        todo RichTextParser
        input

<td style="">
  <span>Every <b>250</b>
    <span class="tooltip" style="position: relative; display: inline;">
      <b>
        <a href="/wiki/Base_Damage" class="mw-redirect" title="">
          <span style="color: #ffffff;">Base Damage</span>
        </a>
      </b>
      <span class="tooltiptext" style="width: 25em;">...</span>
    </span> you deal, spawn a <span class="tooltip" style="position: relative; display: inline;">
      <a href="/wiki/Scythe" title="">
        <img alt="Scythe Icon.png" src="/images/thumb/Scythe_Icon.png/20px-Scythe_Icon.png?16e570" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128">
      </a>
      <b>
        <a href="/wiki/Scythe" class="mw-redirect" title="">
          <span style="color: #5f9fff;">Scythe</span>
        </a>
      </b>
      <span class="tooltiptext" style="width: 25em; left: 1132px; top: 426px;">...</span>
    </span> for 5s ( <span class="tooltip" style="position: relative; display: inline;">
      <a href="/wiki/Auto_Scaling" title="">
        <img alt="Auto Scaling Icon.png" src="/images/thumb/Auto_Scaling_Icon.png/20px-Auto_Scaling_Icon.png?ceb0bb" decoding="async" loading="lazy" width="20" height="20" data-file-width="128" data-file-height="128">
      </a>
      <b>
        <a href="/wiki/Auto_Scaling" class="mw-redirect" title="">
          <span style="color: #ffffff;"></span>
        </a>
      </b>
      <span class="tooltiptext" style="width: 25em;">...</span>
    </span>
    <b>
      <span style="color: #00ff22;">10</span>
    </b> damage). </span>
</td>

        expected output

{
  "imageUrl": "https://windblown.wiki.gg/images/thumb/Damage_Scythe_Icon.png/48px-Damage_Scythe_Icon.png?2431b1",
  "name": "",
  "category": "Scythe",
  "richDescription": [
    {
      "t": "text",
      "text": "Every "
    },
    {
      "bold": true
      "text": "250"
    },
    {
      "t": "entity",
      "text": "Base Damage",
      "href": "/wiki/Base_Damage",
      "color": "#ffffff"
    },
    {
      "t": "text",
      "text": " you deal, spawn a "
    },
    {
      "t": "entity",
      "text": "Scythe",
      "href": "/wiki/Scythe",
      "icon": "/images/thumb/Scythe_Icon.png/20px-Scythe_Icon.png?16e570",
      "color": "#5f9fff"
    },
    {
      "t": "text",
      "text": " for 5s ("
    },
    {
      "t": "entity",
      "text": "",
      "href": "/wiki/Auto_Scaling",
      "icon": "/images/thumb/Auto_Scaling_Icon.png/20px-Auto_Scaling_Icon.png?ceb0bb",
      "color": "#ffffff"
    },
    {
      "text": "10",
      "color": "#00ff22"
      "bold": true
    },
    {
      "t": "text",
      "text": " damage)."
    }
  ]
}
                 */
        System.out.print(a);

        driver.quit();

    }

}
