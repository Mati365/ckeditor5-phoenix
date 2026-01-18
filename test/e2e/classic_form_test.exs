defmodule Playground.ClassicFormTest do
  use Playground.FeatureCase

  feature "Classic Form: submits data", %{session: session} do
    session
    |> visit(~p"/classic-form")
    |> type_in_editor(".ck-editor__editable", "My content")
    |> click(button("Save"))
    |> assert_text("Saved content:")
    |> assert_has(css(".bg-green-100", text: "My content"))
  end
end
