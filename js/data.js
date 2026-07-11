// Default dish collection, ported from Gerichte-Sammlung.md
const ESS_DEFAULT_DATA_RAW = [
  ['🍝', 'Pasta', ['Spaghetti Bolognese', 'Lasagne', 'Tortellini in Schinken-Sahne-Soße', 'Hähnchen-Alfredo', 'Lachs in Zitronen-Sahne-Soße', 'Nudeln mit Hähnchen und Champignonrahmsoße', 'Hackfleisch-Nudelauflauf', 'Hähnchen-Brokkoli-Auflauf', 'Mac and Cheese mit Hähnchen', 'Rigatoni al Forno', 'Pasta mit Tomaten-Sahne-Soße und Hähnchen', 'Spaghetti mit Frikadellen', 'Gnocchi mit Hähnchen und Sahnesoße', 'Penne Arrabbiata mit Hähnchen', 'Käse-Lauch-Hack-Nudeln']],
  ['🍚', 'Reisgerichte', ['Hähnchen-Reis-Pfanne', 'Bratreis mit Hähnchen und Ei', 'Teriyaki-Hähnchen mit Reis', 'Süß-Sauer-Hähnchen', 'Curry-Hähnchen mit Reis', 'Chili con Carne mit Reis', 'Hackfleisch-Reis-Pfanne', 'Gyros mit Reis', 'Geschnetzeltes mit Reis', 'Lachs mit Reis und Gemüse', 'Butter Chicken mit Reis', 'Paprika-Hack-Pfanne mit Reis', 'Hähnchen in Pfefferrahmsoße mit Reis', 'Mexikanische Reispfanne']],
  ['🥔', 'Kartoffelgerichte', ['Ofenkartoffeln mit Hähnchen', 'Kartoffelgratin mit Hähnchen', 'Steak mit Rosmarinkartoffeln', 'Schweinefilet mit Kartoffeln und Champignonrahmsoße', 'Frikadellen mit Kartoffelpüree', 'Schnitzel mit Kartoffeln', 'Bratkartoffeln mit Spiegelei', 'Bratkartoffeln mit Hähnchen', 'Kartoffelauflauf', 'Lachs mit Kartoffeln', 'Kartoffel-Hack-Auflauf', 'Ofengemüse mit Kartoffeln und Hähnchen']],
  ['🌯', 'Wraps, Tortillas & Co.', ['Chicken Wraps', 'Fajitas', 'Burritos mit Hackfleisch', 'Quesadillas mit Hähnchen und Käse', 'Enchiladas', 'Crunchwraps', 'Hähnchen-Tacos', 'Hack-Tacos', 'Steak-Wraps', 'Frühstücks-Burritos mit Ei und Käse']],
  ['🍔', 'Burger & Fast Food', ['Cheeseburger', 'Chickenburger', 'BBQ-Burger', 'Bacon-Cheeseburger', 'Crispy Chicken Burger', 'Hot Dogs', 'Selbstgemachte Chicken Nuggets', 'Kartoffel-Wedges', 'Loaded Fries mit Hackfleisch und Käse']],
  ['🥩', 'Fleischgerichte', ['Schweinefilet mit Champignonrahmsoße', 'Rindersteak mit Pfeffersoße', 'Hähnchengeschnetzeltes', 'Putengeschnetzeltes', 'Frikadellen', 'Schnitzel', 'Cordon Bleu', 'Hackbraten', 'Rouladen', 'Gulasch', 'Gyros', 'Hähnchen aus dem Ofen', 'Hähnchen in Sahnesoße']],
  ['🐟', 'Fisch', ['Lachs aus dem Ofen', 'Lachs mit Pasta', 'Lachs mit Reis', 'Lachs mit Kartoffeln', 'Gebratener Kabeljau', 'Seelachsfilet', 'Backfisch', 'Fischstäbchen', 'Thunfisch-Nudelauflauf', 'Thunfisch-Pasta', 'Sushi', 'Garnelen mit Knoblauchbutter und Reis']],
  ['🍲', 'Aufläufe', ['Kartoffelauflauf', 'Nudelauflauf', 'Brokkoli-Auflauf', 'Hähnchen-Auflauf', 'Hackfleisch-Auflauf', 'Lasagne', 'Tortellini-Auflauf', 'Gyros-Auflauf']],
  ['🥣', 'Suppen & Eintöpfe', ['Käse-Lauch-Hack-Suppe', 'Gulaschsuppe', 'Kartoffelsuppe', 'Hühnersuppe', 'Chili con Carne', 'Tomatensuppe mit Käse-Toast', 'Paprika-Hack-Suppe']],
  ['🥞', 'Einfach & schnell', ['Pfannkuchen (süß oder herzhaft)', 'Omelett', 'Rührei mit Bratkartoffeln', 'Spiegelei mit Kartoffeln', 'Bauernfrühstück', 'Toast Hawaii', 'Überbackene Toasts', 'Flammkuchen', 'Pizzabrötchen', 'Selbstgemachte Pizza']],
  ['🍕', 'Gemütliche Abende', ['Selbstgemachte Pizza', 'Flammkuchen', 'Raclette', 'Grillabend mit Fleisch und Gemüse', 'Burgerabend', 'Taco-Abend', 'Sushi-Abend']]
];

// Shared favorite categories, always visible to both Maria and Janick since
// they live in the same app data — not per-device.
const ESS_FAVORITE_CATEGORIES = [
  { id: 'cat-fav-maria', emoji: '🩷', name: 'Marias Favoriten', dishes: [] },
  { id: 'cat-fav-janick', emoji: '🩵', name: 'Janicks Favoriten', dishes: [] },
];

function essSlugify(s) {
  return (s || 'x').toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/(^-|-$)/g, '') || 'x';
}

function essDefaultData() {
  const rest = ESS_DEFAULT_DATA_RAW.map(([emoji, name, dishes], ci) => ({
    id: 'cat-' + ci + '-' + essSlugify(name),
    emoji, name,
    dishes: dishes.map((d, di) => ({ id: 'cat-' + ci + '-d-' + di, name: d }))
  }));
  return [
    ...ESS_FAVORITE_CATEGORIES.map((c) => ({ ...c, dishes: [...c.dishes] })),
    ...rest,
  ];
}

// One-time migration so people who already saved data on their device (before
// the favorite categories existed) still get them added, without touching
// anything they've already customized.
function essEnsureFavoriteCategories(categories) {
  let changed = false;
  const result = [...categories];
  ESS_FAVORITE_CATEGORIES.forEach((fav) => {
    if (!result.some((c) => c.id === fav.id)) {
      result.unshift({ ...fav, dishes: [...fav.dishes] });
      changed = true;
    }
  });
  return { categories: result, changed };
}
