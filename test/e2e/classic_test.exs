defmodule Playground.ClassicTest do
  use Playground.FeatureCase

  feature "Classic Editor: syncs data and tracks focus", %{session: session} do
    session
    |> visit(~p"/classic")
    |> assert_has(css(".ck-editor__editable"))
    |> type_in_editor(".ck-editor__editable", " test")
    |> assert_text("Hello World! test")
    |> assert_has(css(".ring-blue-500"))
  end
end
