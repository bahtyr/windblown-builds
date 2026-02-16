package org.example;

import org.openqa.selenium.WebElement;

public class Main {


    static void main() {
        Driver.get().get(GiftsPage.URL);

        String section = "General Gifts";
        WebElement table = Driver.get().findElement(GiftsPage.tableOfSection(section));
        // TODO create gift for this given section

        // for table rows
        // get first row
        // get column 1 image
        // get column 2 name
        // get column 3 description


    }

}
