package org.example;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.firefox.FirefoxDriver;

import java.util.List;

public class Main {


    static void main() throws InterruptedException {

        WebDriver driver = new FirefoxDriver();
        driver.get(GiftsPage.URL);
        driver.wait(600);

        String section = "General Gifts";

        WebElement table = driver.findElement(GiftsPage.tableOfSection(section));
        WebElement row = table.findElement(By.tagName("tr"));
        List<WebElement> rows = row.findElements(By.tagName("td"));

        Gift a = new Gift();
        a.imageUrl = rows.get(0).findElement(By.tagName("img")).getAttribute("src");
        a.name = rows.get(1).getText();
        a.category = section.replace(" Gifts", "").trim();
        a.description = rows.get(2).getText();
        WebElement rowDescription = rows.get(2);
        a.richDescription; // todo parse rich text from 'rowDescription'
        System.out.print(a);

        /*

        todo RichTextParser

        cover this html to
         <td style="">
         <span>
         Using a <b>Trinket</b> spawns a
         <span class="tooltip">
         <a href="/wiki/Scythe">
         <img src="/images/thumb/Scythe_Icon.png/20px-Scythe_Icon.png">
         </a>
         <b>
         <a href="/wiki/Scythe">
         <span style="color: #5f9fff;">Scythe</span>
         </a>
         </b>
         <span class="tooltiptext"></span>
         </span>
         for 8s (
         <span class="tooltip">
         <a href="/wiki/Auto_Scaling">
         <img src="/images/thumb/Auto_Scaling_Icon.png/20px-Auto_Scaling_Icon.png">
         </a>
         <b>
         <a href="/wiki/Auto_Scaling">
         <span style="color: #ffffff;"></span>
         </a>
         </b>
         <span class="tooltiptext"></span>
         </span>
         <b><span style="color: #00ff22;">10</span></b>
         damage).
         </span>
         </td>


         convert it to
         [
  {"t":"text","v":"Using a "},
  {"t":"bold","v":"Trinket"},
  {"t":"text","v":" spawns a "},
  {"t":"entity","name":"Scythe","href":"/wiki/Scythe","icon":"/images/...png","color":"#5f9fff"},
  {"t":"text","v":" for 8s ("},
  {"t":"entity","name":"Auto Scaling","href":"/wiki/Auto_Scaling","icon":"/images/...png"},
  {"t":"text","v":" "},
  {"t":"number","v":"10","color":"#00ff22"},
  {"t":"text","v":" damage)."}
]

        --
        make this dynamic, so that it can work on different input texts.

         */

        driver.quit();

    }

}
