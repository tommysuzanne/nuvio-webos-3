// A navigation card contains display fields and stable identities only.
// Full collection/source data remains in CollectionsStore for opening a folder.
export function buildUj630CollectionHomeRow(collection) {
  const items = (collection.folders || []).map(folder => {
    const title = String(folder.title || ""), cover = folder.coverImageUrl || collection.backdropImageUrl || "";
    return {
      id: `collection:${collection.id}:${folder.id}`, collectionId: collection.id,
      folderId: folder.id, collectionTitle: collection.title,
      type: "collection_folder", apiType: "collection_folder", heroSource: "collection",
      rawTitle: title, title: folder.hideTitle ? "" : title, name: folder.hideTitle ? "" : title,
      coverImageUrl: cover, poster: cover, backdrop: cover, background: cover,
      logo: folder.titleLogoUrl || "", titleLogoUrl: folder.titleLogoUrl || "",
      coverEmoji: folder.coverEmoji || "", hideTitle: Boolean(folder.hideTitle),
      tileShape: "LANDSCAPE", focusGifEnabled: false, heroVideoUrl: ""
    };
  });
  const key = `collection_${collection.id}`;
  return {
    rowKind: "collection", collectionId: collection.id, collectionTitle: collection.title,
    type: "collection_folder", homeCatalogKey: key, homeCatalogDisableKey: key,
    pinToTop: Boolean(collection.pinToTop), focusGlowEnabled: false,
    viewMode: collection.viewMode, showAllTab: collection.showAllTab !== false,
    result: {status: "success", data: {items}}
  };
}
