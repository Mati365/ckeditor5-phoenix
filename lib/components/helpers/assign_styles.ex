defmodule CKEditor5.Components.AssignStyles do
  @moduledoc """
  Handles style assignments for the Editor component.
  """

  alias CKEditor5.Helpers

  @doc """
  Assigns styles to the assigns map based on provided style options.
  """
  @spec assign_styles(map(), map()) :: map()
  def assign_styles(assigns, merge_styles) do
    style =
      assigns
      |> Map.get(:style)
      |> Helpers.parse_style()

    styles =
      style
      |> Enum.into(%{})
      |> Map.merge(merge_styles)
      |> Enum.map_join(" ", fn {key, value} -> "#{key}: #{value};" end)

    assigns |> Map.put(:style, styles)
  end
end
