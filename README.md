# [faceMesh](https://github.com/jht9629-nyu/faceMesh.git)

- [entry ?v=09](src/index.html?v=09)
- [entry s1 ?v=09](src/index.html?v=09&group=s1)

## TODO

- [] take on device while images loading is not added correctly

## ISSUES

- https://github.com/ml5js/ml5-next-gen/issues/302
  - facemesh keypoints NOT aligned with video on mobile device

## Notes

```
2026-04-02 01:17:50

// ?v=09
  if (!my.showQRCode) {
    // Position buttons at bottom of screen
    my.ui_container.style('position: fixed; z-index: 1999; bottom: 0; left: 0');
  }

>> using claude in vscode
>> prompt:
In create_ui.js my.ui_container.style is used to possition the element. adjust to position at the bottom of the screen
  my.ui_container.style('position: fixed; bottom: 0; left: 0; z-index: 100;');
>> fails
>> div does not appear
  my.ui_container.elt.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 100%; z-index: 100;';

  // position at bottom of screen
  // my.ui_container.style('position: fixed; bottom: 1000; left: 0; z-index: 100;');
  // {
  //   let elt = my.ui_container.elt;
  //   elt.style.position = 'fixed';
  //   elt.style.bottom = '0';
  //   elt.style.left = '0';
  //   // moLib my.footerElement.style.zIndex = 999;
  //   elt.style.zIndex = 1999;
  //   elt.style.width = '100%';
  //   // elt.style.height = my.footerHeight; // '192px';
  //   // elt.style.backgroundColor = 'black';
  //   // elt.style.color = 'white';
  // }

2026-04-01 23:51:13
>> using claude in vscode to fix:
>> prompt:
function find_img create a span to hold image of with iwidth. a few pixel margin appears above the image. adjust the style to remove any margin or padding
>> spacing still appears above the image
    img.elt.style.cssText = 'width:' + iwidth + 'px; display:block; margin:0; padding:0; vertical-align:top;';
    span.elt.style.cssText = 'display:inline-block; margin:0; padding:0; line-height:0; font-size:0;';
>> spacing still appears
  my.gallery_div.elt.style.fontSize = '0';
  my.gallery_div.elt.style.lineHeight = '0';

>> correct. style.cssText not needed.

2026-04-01 23:58:06

locate_img_key

my.photo_list_render_active

my.photo_list_update_enabled

photo_list_update

function showAll_action() {
  my.photo_max = Number.MAX_SAFE_INTEGER;

  my.photo_max = 512;

my.scrollerEnabled

  console.log('photo_list_render my.photo_list n', my.photo_list.length);

photo_list_update err FirebaseError: Firebase Storage: Object 'm0-@r-@w-/mo-facemesh/m4-facemesh/-ObnENrFDTPmcmq8n6Tc/0309.jpg' does not exist. (storage/object-not-found)

photo_list_update err FirebaseError: Firebase Storage: Object 'm0-@r-@w-/mo-facemesh/m4-facemesh/-OYwI2KRr2Quot_W5HZ7/0067.jpg' does not exist. (storage/object-not-found)

http://127.0.0.1:5503/src/index.html?group=s1&show_remove=1

```
