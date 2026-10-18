"""Tests for the sync plan. Run with: python3 -m unittest discover frame"""

import random
import unittest

from frame_sync import plan, screen_url


def photos(n):
    return [{"id": i, "imageUrl": f"https://images.pexels.com/photos/{i}/p.jpeg"} for i in range(n)]


def uploads(ids, since="2026-10-01"):
    return {f"MY_F{i:04d}": {"pexelsId": i, "since": since} for i in ids}


class PlanTest(unittest.TestCase):
    def run_plan(self, collection, uploaded, last_on_tv=None, count=3, replace=3):
        return plan(collection, uploaded, last_on_tv or {}, count, replace, random.Random(1))

    def test_first_run_fills_the_set(self):
        delete, new = self.run_plan(photos(10), {})
        self.assertEqual(delete, [])
        self.assertEqual(len(new), 3)

    def test_full_refresh_replaces_every_upload_with_other_photos(self):
        delete, new = self.run_plan(photos(10), uploads([0, 1, 2]))
        self.assertCountEqual(delete, ["MY_F0000", "MY_F0001", "MY_F0002"])
        self.assertEqual(len(new), 3)
        self.assertFalse({p["id"] for p in new} & {0, 1, 2})

    def test_partial_refresh_replaces_the_oldest(self):
        uploaded = uploads([0], "2026-10-01") | uploads([1, 2], "2026-10-05")
        delete, new = self.run_plan(photos(10), uploaded, replace=1)
        self.assertEqual(delete, ["MY_F0000"])
        self.assertEqual(len(new), 1)
        self.assertNotIn(new[0]["id"], {0, 1, 2})

    def test_prefers_photos_that_were_never_on_the_tv(self):
        last = {str(i): "2026-10-01" for i in range(9)}
        _, new = self.run_plan(photos(10), {}, last, count=1)
        self.assertEqual(new[0]["id"], 9)

    def test_then_photos_that_were_on_the_tv_longest_ago(self):
        last = {str(i): "2026-10-10" for i in range(10)} | {"4": "2026-09-01"}
        _, new = self.run_plan(photos(10), {}, last, count=1)
        self.assertEqual(new[0]["id"], 4)

    def test_drops_uploads_that_left_the_collection(self):
        delete, _ = self.run_plan(photos(5), uploads([1, 99]), replace=0)
        self.assertEqual(delete, ["MY_F0099"])

    def test_shrinks_to_a_smaller_set(self):
        delete, new = self.run_plan(photos(10), uploads([0, 1, 2, 3, 4]), count=3, replace=0)
        self.assertEqual(len(delete), 2)
        self.assertEqual(new, [])

    def test_small_collection_reuses_replaced_photos(self):
        delete, new = self.run_plan(photos(3), uploads([0, 1, 2]))
        self.assertEqual(len(delete), 3)
        self.assertCountEqual([p["id"] for p in new], [0, 1, 2])

    def test_all_photos_uploads_only_new_ones_and_drops_gone_ones(self):
        delete, new = self.run_plan(photos(5), uploads([0, 1, 2, 99]), count=5, replace=0)
        self.assertEqual(delete, ["MY_F0099"])
        self.assertCountEqual([p["id"] for p in new], [3, 4])

    def test_screen_url_asks_the_cdn_for_a_4k_crop(self):
        self.assertEqual(
            screen_url(photos(1)[0]),
            "https://images.pexels.com/photos/0/p.jpeg?cs=srgb&fit=crop&w=3840&h=2160",
        )


if __name__ == "__main__":
    unittest.main()
