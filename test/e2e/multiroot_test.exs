defmodule Playground.MultirootTest do
  use Playground.FeatureCase

  feature "Multi-root Editor: syncs multiple roots", %{session: session} do
    session
    |> visit(~p"/multiroot")
    |> type_in_editor("[data-cke-editable-root-name='header'] .ck-editor__editable", "H")
    |> assert_text("Main HeaderH")
    |> type_in_editor("[data-cke-editable-root-name='content'] .ck-editor__editable", "S")
    |> assert_text("Main content areaS")
  end

  feature "Multi-root Editor: adding and removing roots", %{session: session} do
    session
    |> visit(~p"/multiroot")
    |> fill_in(css("input[name='root_name']"), with: "sidebar")
    |> click(button("Add Root"))
    |> assert_has(css("#container-sidebar"))
    |> type_in_editor("[data-cke-editable-root-name='sidebar'] .ck-editor__editable", "X")
    |> assert_text("New root: sidebarX")
    |> click(css("#container-header button", text: "Remove"))
    |> refute_has(css("#container-header"))
  end
end
