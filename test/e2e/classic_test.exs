defmodule Playground.ClassicTest do
  use Playground.FeatureCase

  feature "Classic Editor: syncs data and tracks focus", %{session: session} do
    session
    |> visit(~p"/classic")
    |> assert_has(css(".ck-editor__editable"))
    |> type_in_editor(".ck-editor__editable", " test")
    |> assert_text("Hello World! test")
    |> assert_has(css(".border-blue-400"))
  end

  feature "Classic Editor: programmatic set-data updates editor and socket value", %{
    session: session
  } do
    session
    |> visit(~p"/classic")
    |> fill_in(css("textarea[name='new_content']"), with: "<p>Programmatic</p>")
    |> click(button("Set Data"))
    |> assert_text("Programmatic")
    |> assert_has(css("pre", text: "<p>Programmatic</p>"))
  end
end
