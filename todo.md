
# Liked deck build
1. to the my builds page; add a "Favorites" deck.
2. hidden if there are no favorites
3. auto add all liked entities from the browse page here

# Deck more info
- add list of gift categories
- location: left of a deck (like sidepanel)
- note: categories currently don't have a image list, but it would be good if we create a image mapping for category titles, we can find this from entity images? and store it in a json file maybe? this would be a one time thing to generate. then, this would be only used for this purpose, no need to add this to browse page.

# Deck hover content
- hovering on a deck item shows their description - as seen in the browse page cards (image & fav / add actions hidden)
- remove names from deck items, image only. hovering will show name.

# Entity videos
1. parse from wiki > opening entity page has video
2. weapons have multiple videos need to store all...
3. need to show this somewhere somehow... 
4. on the deck hover; show this alongside on top of entity description card
5. on the browse page. show the video on hover to the image (floating not inserted in to the card)
6. show be small thumb not huge

---

# Gift matching improvements

# Gift matching debugger
to discuss before implementing

- suggest crop zone. issue: bigger in game image screenshot detects unintentional squares - we need to ensure the detector focuses on right area. A this should be done automatically. need to define how B allow user to adjust if needed??
- for failed case, allow picking from the top 3
- the found success cases should be faded/less visible?


# Better detect build flow
- keep the gift matcher debugger page as separate ui flow
- goal: need to make a user facing easier flow to auto detect build from image and create a build;

## v1 dialog
- add 'New run' button (this means the user play a game / a run. we will upload their run screenshot)
- opens a popup.
- says; click here to upload image / or drag and drop image here. (similar to attach file or drag modals in google drive etc)
- attached source image should have max width/height - should not take over full screen
- auto start parsing when file selected
- no need to show total time took.
- still highlight found & not found squares
- show deck builder like layout, input for name, and list of added items. added items have remove button.
- add items should be successful matches
- below separate section shows failed matches;
- in similar UI, show all other candidates with add button.
- adding adds to deck above (don't remove from current list)
- save build button.
- edit button >> this saves first then opens edit modal so the user doesn't loose it.
- dialog has x button at top right
- backgounrd faded
- 
- clicking these items does not change the highlighted squares in the source image.
- note; this saves deck immeditely does not use share link / open link method previously used

## v2 anywhere in the app
- anyhwere in the app accept drag&drop image (show some drop image to create deck kind of text)
- dropping opens the dialog
- also accept copy/paste - if user clicks paste and it's content is image open the dialog

---

# Builds vs runs
to discuss first before implementing;
now that parsing a deck from an image is easy - people might do many.
so we might need to differentiate between auto generated just played this run / match history vs saved liked currated decks
so there could be two tabs in my builds page maybe? or two separate secionts / lists
potenntionally rebrand my builds/your libray as "my profile"

# Browse filter button
to discuss first before impelemting;
need to consider reset filters button look location
issue: scrolling within the side panel hides the button + any other selected filter. this is a bit bad.
