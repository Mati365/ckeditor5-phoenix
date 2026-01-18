defmodule Playground.ClassicRequiredFormTest do
  use Playground.FeatureCase

  feature "Classic Required Form: requires content", %{session: session} do
    session
    |> visit(~p"/classic-required-form")
    # Submit empty
    |> click(button("Save"))
    |> refute_has(Query.text("Saved content:"))

    # Fill and submit
    |> type_in_editor(".ck-editor__editable", "Valid")
    |> then(fn session ->
      # Wait for debounced save to sync with hidden input
      Process.sleep(500)
      session
    end)
    |> click(button("Save"))
    |> assert_has(Query.text("Saved content:"))
    |> assert_has(css(".bg-green-100", text: "Valid"))
  end
end
