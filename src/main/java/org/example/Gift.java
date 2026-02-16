package org.example;

public class Gift {
    String imageUrl;
    String name;
    String category;
    String description;
    String richDescription;

    @Override
    public String toString() {
        return "Gift{" +
                "imageUrl='" + imageUrl + '\'' +
                ", name='" + name + '\'' +
                ", category='" + category + '\'' +
//                ", description='" + description + '\'' + skip
                ", richDescription=" + richDescription +
                '}'; // todo convert this to json like format
        // todo if very easy, beautify json
    }
}
