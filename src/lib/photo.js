//

/*
photo_meta 
  photo_index

photo_store
  key 
    { uid, order, name, index, width, height }

dbase_add_key( 'photo_store' ) --> key

fstorage_upload({ path: key
  path = key/name
*/

// my.photo_list = [ { } ]
// {
//   "index": 19,
//   "name": "019.jpg",
//   "uid": "DK1Lcj16BFhDPgdvGGkVP9FS3Xy2"
// }

function photo_path_entry(entry) {
  // return entry.key + '/' + entry.uid + '/' + entry.name;
  // return `${entry.order}/${entry.key}/${entry.uid}/${entry.name}`;
  return `${entry.key}/${entry.name}`;
}

function photo_new_entry(index) {
  let order = index.toString().padStart(4, '0');
  let name = order + my.imageExt;
  let uid = my.uid;
  let color = my.avg_color;
  let createdAt = new Date().toISOString();
  return { uid, name, index, width, height, color, createdAt };
}

async function photo_list_remove_entry(entry) {
  // console.log('photo_list_remove_entry entry', entry);
  let path = photo_path_entry(entry);
  try {
    await fstorage_remove({ path });
    await dbase_remove_key('photo_store', entry.key);
  } catch (err) {
    console.log('photo_list_remove_entry err', err);
  }
}

function photo_list_update() {
  console.log('photo_list_update');
  scroller_pause();
  my.photo_list_update_pending = 1;
}

function photo_list_update_poll() {
  if (my.photo_list_update_pending) {
    my.photo_list_update_pending = 0;
    photo_list_render();
  }
}

async function photo_list_render() {
  // console.log('photo_list_update my.photo_list', my.photo_list);
  // Create images from my.photo_store
  // showing most recent first
  //
  my.photo_list = [];
  let entries = Object.entries(my.photo_store);
  let nlast = entries.length;
  let istart = nlast - my.photo_max;
  if (istart < 0) istart = 0;
  for (let i = istart; i < nlast; i++) {
    let ent = entries[i];
    let key = ent[0];
    let photo = ent[1];
    photo.key = key;
    my.photo_list.push(photo);
  }
  // console.log('photo_list_render my.photo_list', my.photo_list);
  console.log('photo_list_render my.photo_list n', my.photo_list.length);
  for (let entry of my.photo_list) {
    let path = photo_path_entry(entry);
    try {
      let url = await fstorage_download_url({ path });
      url_result(url, entry.key);
    } catch (err) {
      console.log('photo_list_update err', err);
    }
  }
  function url_result(url, key) {
    // console.log('url_result index', index, 'url', url);
    // Images are prepended
    let img = find_img(key);
    img.elt.src = url;
  }

  add_action_stopLoader();
}

function proto_prune_poll() {
  if (my.photo_prune_pending) {
    my.photo_prune_pending = 0;
    photo_list_prune();
  }
}
function photo_list_prune() {
  let photos_present = {};
  for (let entry of my.photo_list) {
    photos_present[entry.key] = 1;
  }
  for (let key in my.gallery_items) {
    let span = my.gallery_items[key];
    if (!photos_present[key]) {
      console.log('photo_list_update remove key', key);
      span.remove();
      delete my.gallery_items[key];
    }
  }
}

async function add_action() {
  console.log('add_action ');

  add_action_startLoader();

  let entry = photo_new_entry(my.photo_index + 1);

  let layer = my.canvas;
  let imageQuality = my.imageQuality;

  let key = await dbase_add_key('photo_store', entry);
  // console.log('add_action key', key);
  // console.log('add_action result.key', result.key);
  entry.key = key;
  let path = photo_path_entry(entry);

  try {
    await fstorage_upload({ path, layer, imageQuality });
    dbase_update_item({ photo_index: dbase_increment(1) }, 'item');
  } catch (err) {
    console.log('take_action err', err);
  }
}

async function take_action() {
  // console.log('take_action');
  // let n = my.photo_list.length;
  // remove_action();
  add_action();
}

async function remove_action() {
  let response = confirm('remove photo ' + my.photo_index);
  if (response) {
    remove_action_confirmed();
  }
}

async function remove_action_confirmed() {
  console.log('remove_action photo_count', my.photo_list.length);
  let n = my.photo_list.length;
  if (n < 1) {
    // No more images in the cloud
    //  zero out photo_index
    dbase_update_item({ photo_index: 0 }, 'item');
    return;
  }
  startLoader();

  // Remove first on screen
  let photo = my.photo_list[n - 1];
  await photo_list_remove_entry(photo);

  // setTimeout(photo_list_prune, 2000);

  stopLoader();
}

async function remove_all_action() {
  let response = confirm('remove all photos n=' + my.photo_list.length);
  if (response) {
    remove_all_action_confirmed();
  }
}

async function remove_all_action_confirmed() {
  //
  startLoader();

  for (let photo of my.photo_list) {
    await photo_list_remove_entry(photo);
  }
  // zero out photo_index
  dbase_update_item({ photo_index: 0 }, 'item');

  stopLoader();

  // setTimeout(photo_list_prune, 2000);
}
