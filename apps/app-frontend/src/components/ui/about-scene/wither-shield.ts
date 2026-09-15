type Point = [number, number]
type Quad = [Point, Point, Point, Point]
type ShieldSurface = { plane: Quad; outline?: Point[]; shade?: number }

// Coordinates follow the sharp master with its localized shoulder cleanup,
// normalized to the scene's 2048 × 682⅔ plate.
// Each visible bone has its own face: the air between ribs must never receive armor.
export const witherShieldSurfaces: ShieldSurface[] = [
	// Only the upper chest remains; the removed side beams have no shield surfaces.
	{
		plane: [
			[1194, 479],
			[1294, 489],
			[1283, 516],
			[1183, 505],
		],
	},
	// Far central skull: face, jaw wall and right side share the same edges.
	{
		plane: [
			[1162, 355],
			[1319, 352],
			[1267, 446],
			[1108, 442],
		],
	},
	{
		plane: [
			[1108, 442],
			[1267, 446],
			[1280, 489],
			[1119, 470],
		],
		shade: 0.68,
	},
	{
		plane: [
			[1319, 352],
			[1356, 443],
			[1319, 492],
			[1267, 446],
		],
		shade: 0.6,
	},
	// Near-left skull, underneath the boot.
	{
		plane: [
			[794, 477],
			[968, 454],
			[1003, 549],
			[833, 602],
		],
	},
	{
		plane: [
			[794, 477],
			[833, 602],
			[821, 625],
			[781, 539],
		],
		shade: 0.55,
	},
	{
		plane: [
			[833, 602],
			[1003, 549],
			[983, 587],
			[821, 625],
		],
		shade: 0.65,
	},
	// Right skull.
	{
		plane: [
			[1482, 399],
			[1639, 469],
			[1568, 582],
			[1402, 507],
		],
	},
	{
		plane: [
			[1639, 469],
			[1650, 557],
			[1597, 631],
			[1568, 582],
		],
		shade: 0.57,
	},
	{
		plane: [
			[1402, 507],
			[1568, 582],
			[1597, 631],
			[1414, 583],
		],
		shade: 0.66,
		outline: [
			[1402, 507],
			[1568, 582],
			[1597, 631],
			[1561, 637],
			[1444, 621],
			[1414, 583],
		],
	},
	// Rear rib, left and right of the chest opening.
	{
		plane: [
			[1021, 505],
			[1129, 484],
			[1118, 501],
			[1009, 520],
		],
	},
	{
		plane: [
			[1009, 520],
			[1118, 501],
			[1112, 515],
			[1006, 535],
		],
		shade: 0.65,
	},
	{
		plane: [
			[1191, 486],
			[1300, 510],
			[1289, 530],
			[1181, 510],
		],
	},
	{
		plane: [
			[1289, 530],
			[1300, 510],
			[1310, 611],
			[1296, 621],
		],
		shade: 0.6,
	},
	// Middle rib and broken sternum: separate profiles preserve the dark gaps.
	{
		plane: [
			[1052, 514],
			[1159, 519],
			[1129, 553],
			[992, 548],
		],
		outline: [
			[1015, 535],
			[1052, 520],
			[1094, 522],
			[1110, 514],
			[1159, 519],
			[1129, 553],
			[992, 548],
		],
	},
	{
		plane: [
			[992, 548],
			[1129, 553],
			[1137, 575],
			[987, 567],
		],
		shade: 0.6,
	},
	{
		plane: [
			[1159, 519],
			[1170, 560],
			[1137, 575],
			[1129, 553],
		],
		shade: 0.55,
	},
	{
		plane: [
			[1180, 513],
			[1289, 551],
			[1274, 575],
			[1159, 538],
		],
	},
	{
		plane: [
			[1274, 575],
			[1289, 551],
			[1298, 617],
			[1279, 632],
		],
		shade: 0.62,
	},
	// Closest right rib; its downturned end stops above the ground.
	{
		plane: [
			[1157, 542],
			[1261, 581],
			[1243, 602],
			[1141, 564],
		],
	},
	{
		plane: [
			[1141, 564],
			[1243, 602],
			[1255, 641],
			[1148, 605],
		],
		shade: 0.7,
	},
	{
		plane: [
			[1243, 602],
			[1261, 581],
			[1270, 627],
			[1255, 641],
		],
		shade: 0.55,
	},
	// Foreground rib and spine.
	{
		plane: [
			[1000, 566],
			[1140, 581],
			[1107, 604],
			[960, 589],
		],
	},
	{
		plane: [
			[960, 589],
			[1107, 604],
			[1112, 680],
			[968, 622],
		],
		shade: 0.6,
		outline: [
			[960, 589],
			[1107, 604],
			[1112, 680],
			[1070, 681],
			[1066, 619],
			[968, 611],
		],
	},
	{
		plane: [
			[1107, 604],
			[1140, 581],
			[1160, 669],
			[1112, 680],
		],
		shade: 0.5,
	},
	{
		plane: [
			[986, 611],
			[1070, 617],
			[967, 684],
			[874, 671],
		],
	},
	{
		plane: [
			[1070, 617],
			[1074, 668],
			[1060, 684],
			[967, 684],
		],
		shade: 0.55,
	},
]
