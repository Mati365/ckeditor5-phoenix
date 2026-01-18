defmodule Playground.MultirootTest do
  use Playground.FeatureCase

  feature "Multi-root Editor: syncs multiple roots", %{session: session} do
    session
    |> visit(~p"/multiroot")
    |> type_in_editor("[data-cke-editable-root-name='header'] .ck-editor__editable", "H")
    |> assert_text("Main HeaderH")
    |> type_in_editor("[data-cke-editable-root-name='sidebar'] .ck-editor__editable", "S")
    |> assert_text("Sidebar contentS")
  end
end
