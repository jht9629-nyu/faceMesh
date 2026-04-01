//

function scroller_init() {
  //
  my.scrollIndex = 0;
  my.scrollSpeeds = [0, 1, 2];
  // my.scrollSpeeds = [0, 1, 8, 16, 32, 1];
  my.scrollDirection = 1;
  my.scrollBy = 0;
  my.scrollTopLocationY = 1080;

  // my.scrollEnabled = 0;
  my.stallMaxTime = 10.0;

  my.rwidth = 1920;

  // for m5body with installed images
  let images = [];
  let n = my.nscrollImages;
  for (let index = 0; index <= n; index++) {
    let path = `${my.scrollerImagesPath}/${index}.png`;
    let altText = 'image' + index;
    images.push({ path, altText });
  }
  my.images = images;

  if (n > 0) {
    received_gallery(my.images);
  }
}

function scrollerEnabled_toggle() {
  my.scrollerEnabled = !my.scrollerEnabled;
  if (my.scrollerEnabled) {
    if (!scroller_isActive()) {
      scroller_resume();
    }
  } else {
    if (scroller_isActive()) {
      scroller_pause();
    }
  }
}

function scroller_isActive() {
  return my.scrollBy != 0;
}

function scroller_pause() {
  if (my.scroll_topLocationY) {
    window.scrollTo(0, my.scroll_topLocationY);
  }
  if (my.scrollTimer) {
    my.scrollTimer.restart();
  }
  if (my.scrollBy == 0) {
    return;
  }
  my.scrollByPrior = my.scrollBy;
  my.scrollBy = 0;
}

function scroller_resume() {
  my.scrollBy = my.scrollByPrior;
}

function scroller_next(dir) {
  my.scrollDirection = dir;
  my.scrollByPrior = my.scrollBy;
  my.scrollBy = 1080 * dir;
  my.scrollRestorePending = 1;
  // console.log('scroller_faster scrollBy', my.scrollBy);
}

function scroller_faster(dir) {
  my.scrollDirection = dir;
  my.scrollIndex = (my.scrollIndex + 1) % my.scrollSpeeds.length;
  my.scrollBy = my.scrollSpeeds[my.scrollIndex];
  // console.log('scroller_faster dir', my.scrollDirection, 'scrollIndex', my.scrollIndex, 'scrollBy', my.scrollBy);
}

function scroller_update() {
  // console.log(
  //   'scroller_update scrollBy',
  //   my.scrollBy,
  //   'scrollDirection',
  //   my.scrollDirection,
  //   'scrollRestorePending',
  //   my.scrollRestorePending
  // );

  if (my.scrollBy == 0) return;
  // console.log('scroller_update scrollBy not zero', my.scrollBy);

  let f = 60 / frameRate();
  let scrollBy = my.scrollBy;
  if (!my.scrollRestorePending) {
    scrollBy = Math.round(scrollBy * f) * my.scrollDirection;
  }

  window.scrollBy(0, scrollBy);
  // console.log('scroller_update scrollBy ', scrollBy);

  if (scroller_isStalled()) {
    // when scroll reaches end wait 5 seconds then restart
    //
    if (!my.scrollResetPending) {
      my.scrollResetPending = 1;
      setTimeout(function () {
        scroller_reset();
        my.scrollResetPending = 0;
      }, 5000);
    }
  }

  if (my.scrollRestorePending) {
    my.scrollRestorePending = 0;
    my.scrollBy = my.scrollByPrior;
  }
}

function scroller_reset() {
  window.scrollTo(0, my.scroll_topLocationY);
  my.lastY = 0;
  my.scrollStartTime = 0;
  my.scrollDelayTime = 0;
  // my.scrollIndex = 0;
  // my.scrollBy = 0;
}

function scroller_isStalled() {
  let now = millis() / 1000.0;
  if (!my.scrollStartTime) my.scrollStartTime = now;
  if (!my.lastY || my.lastY != window.scrollY) {
    my.lastY = window.scrollY;
    my.scrollStartTime = now;
    return false;
  }
  // window.scrollY not changed
  //
  let lapse = now - my.scrollStartTime;
  if (lapse > my.stallMaxTime) {
    return true;
  }
  return false;
}

// data = [ {path, altText}, ... ]
//
function received_gallery(data, opts) {
  window.scrollTo(0, 0);
  let div = ui_div_empty('id_gallery');
  if (!data) {
    return;
  }
  my.imgs = [];

  // for (key in data) {
  //   console.log('key', key);
  //   let val = data[key];

  // Display in reverse order to see new additions first
  // rarr = Object.values(data).reverse();
  let rarr = Object.values(data);
  if (opts && opts.doShuffle) {
    rarr = shuffle(rarr);
  }
  // let r = rarr;
  // rarr = [r[0],r[1],r[0],r[2],r[0],r[3],r[0],r[4],r[0],r[5]];

  nitems = rarr.length;
  for (let ent of rarr) {
    // console.log('received_gallery ent', ent);
    let img = createImg(ent.path, ent.altText, '', function () {
      // console.log('imageLoaded', path);
    });
    div.child(img);

    let iwidth = my.rwidth;
    img.style('width: ' + iwidth + 'px;');
    img.addClass('center-image');
    my.imgs.push(img);
    // ui_init_update();
  }
}
