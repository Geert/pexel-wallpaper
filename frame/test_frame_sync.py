"""Tests for the sync plan. Run with: python3 -m unittest discover frame"""

import random
import threading
import time
import unittest
from unittest import mock

import frame_sync
from frame_sync import TVTimeout, collection_id, fetch_collection, plan, screen_url, tv_call


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
            "https://images.pexels.com/photos/0/p.jpeg?cs=srgb&fm=jpg&fit=crop&w=3840&h=2160",
        )


class CollectionTest(unittest.TestCase):
    def test_collection_id_from_url_or_id(self):
        for value in [
            "https://www.pexels.com/collections/wallpapers-vmnecek/",
            "https://www.pexels.com/nl-nl/collections/wallpapers-vmnecek",
            "vmnecek",
        ]:
            self.assertEqual(collection_id(value), "vmnecek")

    def test_collection_id_rejects_other_urls(self):
        with self.assertRaises(SystemExit):
            collection_id("https://www.pexels.com/photo/1234/")

    def test_fetch_collection_follows_pages_and_skips_videos(self):
        def media(i, kind="Photo"):
            return {"type": kind, "id": i, "width": 4000, "height": 2250, "alt": f"photo {i}",
                    "photographer": "A", "src": {"original": f"https://images.pexels.com/{i}.jpeg"}}

        pages = [
            {"media": [media(1), media(2, "Video")], "next_page": "page 2"},
            {"media": [media(3)]},
        ]
        with mock.patch.object(frame_sync, "get_json", side_effect=pages) as get:
            photos = fetch_collection("abc", "key")
        self.assertEqual([p["id"] for p in photos], [1, 3])
        self.assertEqual(photos[0]["imageUrl"], "https://images.pexels.com/1.jpeg")
        self.assertIn("page=2", get.call_args_list[1].args[0])
        self.assertEqual(get.call_args_list[0].kwargs["headers"], {"Authorization": "key"})


class TVCallTest(unittest.TestCase):
    def test_returns_the_result(self):
        self.assertEqual(tv_call(5, lambda: 42), 42)

    def test_gives_up_on_a_call_that_hangs(self):
        with self.assertRaises(TVTimeout):
            tv_call(1, time.sleep, 5)

    def test_gives_up_without_sigalrm_too(self):
        # Outside the main thread, as on Windows, tv_call waits on a worker thread.
        errors = []

        def run():
            try:
                tv_call(1, time.sleep, 5)
            except TVTimeout as e:
                errors.append(e)

        worker = threading.Thread(target=run)
        worker.start()
        worker.join(3)
        self.assertEqual(len(errors), 1)


if __name__ == "__main__":
    unittest.main()
