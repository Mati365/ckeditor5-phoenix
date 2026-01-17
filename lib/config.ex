defmodule CKEditor5.Config do
  @moduledoc """
  Provides access to CKEditor 5 configuration, specifically the presets defined in the application environment.
  Prefer to not modify values too much, do it in other modules.
  """

  @app :ckeditor5_phoenix

  @doc """
  Returns the raw presets configuration from the application environment.
  It's unprocessed raw configuration, not merged with defaults.
  In order to use processed presets, use `CKEditor5.Presets.presets/0` or `CKEditor5.Presets.presets_with_default/0`.
  """
  @spec raw_presets() :: map()
  def raw_presets do
    Application.get_env(@app, :presets, %{})
  end

  @doc """
  Returns the raw contexts configuration from the application environment.
  It's unprocessed raw configuration.
  """
  @spec raw_contexts() :: map()
  def raw_contexts do
    Application.get_env(@app, :contexts, %{})
  end

  @doc """
  Returns the uploads configuration from the application environment.
  """
  @spec uploads_config() :: map()
  def uploads_config do
    Application.get_env(@app, :uploads, %{})
  end
end
