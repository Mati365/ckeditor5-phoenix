defmodule Playground.InlineTest do
  use Playground.FeatureCase

  feature "Inline Editor: syncs data", %{session: session} do
    session
    |> visit(~p"/inline")
    |> type_in_editor(".ck-editor__editable", " inline test")
    |> assert_text("inline test")
  end
end
